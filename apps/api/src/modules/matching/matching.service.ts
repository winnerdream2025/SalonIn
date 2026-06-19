import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Availability } from '@salonin/types'
import type { WorkerCardData, CursorResponse } from '@salonin/types'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { MetricsService } from '../../common/metrics/metrics.service'
import type { FindNearbyWorkersDto } from './dto/find-nearby-workers.dto'

const RADIUS_STEPS = [15, 30, 50, 100] as const
const MIN_RESULTS = 5
const CACHE_TTL = 300
const GEO_QUERY_TIMEOUT_MS = 5000

interface RawWorker {
  id: string
  name: string
  photoUrl: string | null
  bio: string | null
  specialties: string[] | string
  availability: string
  experienceYears: number
  isVerified: boolean
  cityId: string
  distanceMeters: number
  rateRange: string | null
  rateNote: string | null
  rating: number
  reviewCount: number
}

interface WorkerCursor {
  dm: number
  id: string
}

function parsePostgresArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value
  if (!value || value === '{}') return []
  return value
    .slice(1, -1)
    .split(',')
    .map((v) => v.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  async findNearbyWorkers(params: FindNearbyWorkersDto): Promise<CursorResponse<WorkerCardData>> {
    const cacheKey = this.buildCacheKey(params, params.radiusMiles)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.metrics.increment('cache.hit', [`city:${params.cityId}`])
      return JSON.parse(cached) as CursorResponse<WorkerCardData>
    }
    this.metrics.increment('cache.miss', [`city:${params.cityId}`])

    let rows: RawWorker[] = []
    let usedRadius = params.radiusMiles

    if (params.cursor) {
      rows = await this.queryNearbyWorkers(params)
    } else {
      for (const radius of RADIUS_STEPS) {
        if (radius < params.radiusMiles) continue
        rows = await this.queryNearbyWorkers({ ...params, radiusMiles: radius })
        usedRadius = radius
        if (rows.length >= MIN_RESULTS) break
      }
    }

    const isExpanded = usedRadius > params.radiusMiles

    let result: CursorResponse<WorkerCardData>

    if (rows.length === 0 && !params.cursor) {
      const fallback = await this.getFallbackWorkers(params.cityId, params.specialty)
      result = {
        data: fallback.map((w) => this.toWorkerCardDataFromProfile(w)),
        nextCursor: null,
        hasMore: false,
        usedRadius,
        isExpanded,
      }
    } else {
      const hasMore = rows.length > 50
      const slice = rows.slice(0, 50)
      const nextCursor = hasMore ? this.encodeCursor(slice[49]!) : null

      // Fetch portfolio thumbnails for returned workers
      const workerIds = slice.map((r) => r.id)
      const portfolioRows = workerIds.length > 0
        ? await this.prisma.portfolioItem.findMany({
            where: { workerId: { in: workerIds }, type: 'IMAGE' },
            select: { workerId: true, mediaUrl: true },
            orderBy: { createdAt: 'desc' },
          })
        : []
      const portfolioMap = new Map<string, string[]>()
      for (const p of portfolioRows) {
        const list = portfolioMap.get(p.workerId) ?? []
        if (list.length < 6) list.push(p.mediaUrl)
        portfolioMap.set(p.workerId, list)
      }

      result = {
        data: slice.map((r) => ({
          ...this.toWorkerCardData(r),
          portfolioUrls: portfolioMap.get(r.id) ?? [],
        })),
        nextCursor,
        hasMore,
        usedRadius,
        isExpanded,
      }
    }

    const finalCacheKey = this.buildCacheKey(params, usedRadius)
    await this.redis.set(finalCacheKey, JSON.stringify(result), 'EX', CACHE_TTL)
    this.metrics.gauge('active_workers_by_city', result.data.length, [`city:${params.cityId}`])

    return result
  }

  private async queryNearbyWorkers(params: FindNearbyWorkersDto): Promise<RawWorker[]> {
    const radiusMeters = params.radiusMiles * 1609.344
    const cursor = params.cursor ? this.decodeCursor(params.cursor) : null

    const availFilter = params.availability != null
      ? Prisma.sql`AND wp.availability = CAST(${params.availability} AS "Availability")`
      : Prisma.sql`AND wp.availability != CAST('NOT_AVAILABLE' AS "Availability")`

    const specialtyFilter = params.specialty != null
      ? Prisma.sql`AND ${params.specialty} = ANY(wp.specialties)`
      : Prisma.sql``

    const cursorFilter = cursor != null
      ? Prisma.sql`WHERE "distanceMeters" > ${cursor.dm}
          OR ("distanceMeters" = ${cursor.dm} AND id > ${cursor.id})`
      : Prisma.sql``

    const queryStart = Date.now()
    const timeout = new Promise<never>((_, reject) => {
      const t = setTimeout(() => reject(new Error('GEO_QUERY_TIMEOUT')), GEO_QUERY_TIMEOUT_MS)
      t.unref()
    })
    let rows: RawWorker[]
    try {
      rows = await Promise.race([
        this.prisma.$queryRaw<RawWorker[]>(Prisma.sql`
      WITH distances AS (
        SELECT
          wp.id,
          wp.name,
          wp."photoUrl",
          wp.bio,
          wp.specialties,
          wp.availability::text AS availability,
          wp."experienceYears",
          wp."isVerified",
          wp."cityId",
          wp."rateRange",
          wp."rateNote",
          wp.rating,
          wp."reviewCount",
          ROUND(ST_Distance(
            wp.location::geography,
            ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
          ))::integer AS "distanceMeters"
        FROM "WorkerProfile" wp
        WHERE
          wp.location IS NOT NULL
          AND ST_DWithin(
            wp.location::geography,
            ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
            ${radiusMeters}
          )
          AND EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = wp."userId"
            AND u."isActive" = true
          )
          ${availFilter}
          ${specialtyFilter}
      )
      SELECT * FROM distances
      ${cursorFilter}
      ORDER BY "distanceMeters" ASC, id ASC
      LIMIT 51
    `),
        timeout,
      ])
    } catch (err) {
      if (err instanceof Error && err.message === 'GEO_QUERY_TIMEOUT') {
        this.metrics.increment('geo_query_timeout', [`city:${params.cityId}`])
        return []
      }
      throw err
    }

    this.metrics.timing('geo_query_duration', Date.now() - queryStart, [`city:${params.cityId}`])
    return rows
  }

  private async getFallbackWorkers(cityId: string | undefined, specialty?: string) {
    return this.prisma.workerProfile.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        user: { isActive: true },
        availability: { not: 'NOT_AVAILABLE' as Availability },
        ...(specialty ? { specialties: { has: specialty } } : {}),
      },
      orderBy: { id: 'desc' },
      take: 10,
      include: { user: { select: { id: true, email: true } } },
    })
  }

  private toWorkerCardData(raw: RawWorker): WorkerCardData {
    return {
      id: raw.id,
      name: raw.name,
      photoUrl: raw.photoUrl,
      bio: raw.bio,
      specialties: parsePostgresArray(raw.specialties),
      availability: raw.availability as Availability,
      distanceMiles: Math.round((raw.distanceMeters / 1609.344) * 100) / 100,
      experienceYears: Number(raw.experienceYears),
      isVerified: Boolean(raw.isVerified),
      cityId: raw.cityId,
      rateRange: raw.rateRange ?? undefined,
      rateNote: raw.rateNote ?? undefined,
      rating: Number(raw.rating) > 0 ? Number(raw.rating) : undefined,
      reviewCount: Number(raw.reviewCount) > 0 ? Number(raw.reviewCount) : undefined,
    }
  }

  private toWorkerCardDataFromProfile(worker: {
    id: string
    name: string
    photoUrl: string | null
    bio?: string | null
    specialties: string[] | string
    availability: Availability | string
    experienceYears: number
    isVerified: boolean
    cityId: string
    rateRange?: string | null
    rateNote?: string | null
    [key: string]: unknown
  }): WorkerCardData {
    return {
      id: worker.id,
      name: worker.name,
      photoUrl: worker.photoUrl,
      bio: (worker.bio as string | null | undefined) ?? null,
      specialties: parsePostgresArray(worker.specialties),
      availability: worker.availability as Availability,
      distanceMiles: null,
      experienceYears: Number(worker.experienceYears),
      isVerified: Boolean(worker.isVerified),
      cityId: worker.cityId,
      rateRange: (worker.rateRange as string | null | undefined) ?? undefined,
      rateNote: (worker.rateNote as string | null | undefined) ?? undefined,
    }
  }

  private buildCacheKey(params: FindNearbyWorkersDto, radius: number): string {
    const { cityId, lat, lng, specialty, availability, cursor } = params
    return `nearby:${cityId}:${lat}:${lng}:${radius}:${specialty ?? 'all'}:${availability ?? ''}:${cursor ?? ''}`
  }

  private encodeCursor(worker: RawWorker): string {
    const payload: WorkerCursor = { dm: worker.distanceMeters, id: worker.id }
    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  private decodeCursor(cursor: string): WorkerCursor | null {
    try {
      const raw = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as unknown
      if (
        typeof raw === 'object' &&
        raw !== null &&
        typeof (raw as WorkerCursor).dm === 'number' &&
        typeof (raw as WorkerCursor).id === 'string'
      ) {
        return raw as WorkerCursor
      }
      return null
    } catch {
      return null
    }
  }
}
