import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Availability } from '@salonin/types'
import type { WorkerCardData, CursorResponse } from '@salonin/types'
import { specialtyLabel } from '@salonin/config'
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
  userId: string
  name: string
  photoUrl: string | null
  bio: string | null
  specialties: string[] | string
  availability: string
  experienceYears: number
  isVerified: boolean
  city: string | null
  state: string | null
  country: string | null
  distanceMeters: number | null
  rateRange: string | null
  rateNote: string | null
  rating: number
  reviewCount: number
  acceptsBookings: boolean
  homeServiceEnabled: boolean
  travelServiceEnabled: boolean
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
      this.metrics.increment('cache.hit', [`geo:${params.lat.toFixed(2)},${params.lng.toFixed(2)}`])
      return JSON.parse(cached) as CursorResponse<WorkerCardData>
    }
    this.metrics.increment('cache.miss', [`geo:${params.lat.toFixed(2)},${params.lng.toFixed(2)}`])

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
      // Far-but-real workers: order by true distance from the searcher so the
      // card still shows "X mi away" instead of hiding distance entirely.
      const fallback = await this.getFallbackWorkers(params.lat, params.lng, params.specialty)
      // Fallback cards need portfolio thumbnails too — otherwise every card
      // renders bare (no work-photo strip) whenever the geo query finds nobody.
      const portfolioMap = await this.fetchPortfolioMap(fallback.map((w) => w.id))
      result = {
        data: fallback.map((r) => {
          const pf = portfolioMap.get(r.id)
          return {
            ...this.toWorkerCardData(r),
            portfolioUrls: pf?.urls ?? [],
            portfolioMedia: pf?.media ?? [],
          }
        }),
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
      const portfolioMap = await this.fetchPortfolioMap(slice.map((r) => r.id))

      result = {
        data: slice.map((r) => {
          const pf = portfolioMap.get(r.id)
          return {
            ...this.toWorkerCardData(r),
            portfolioUrls: pf?.urls ?? [],
            portfolioMedia: pf?.media ?? [],
          }
        }),
        nextCursor,
        hasMore,
        usedRadius,
        isExpanded,
      }
    }

    const finalCacheKey = this.buildCacheKey(params, usedRadius)
    await this.redis.set(finalCacheKey, JSON.stringify(result), 'EX', CACHE_TTL)
    this.metrics.gauge('active_workers_by_geo', result.data.length, [`geo:${params.lat.toFixed(2)},${params.lng.toFixed(2)}`])

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
          wp."userId",
          wp.name,
          wp."photoUrl",
          wp.bio,
          wp.specialties,
          wp.availability::text AS availability,
          wp."experienceYears",
          wp."isVerified",
          wp.city,
          wp.state,
          wp.country,
          wp."rateRange",
          wp."rateNote",
          wp.rating,
          wp."reviewCount",
          wp."acceptsBookings",
          wp."homeServiceEnabled",
          wp."travelServiceEnabled",
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
        this.metrics.increment('geo_query_timeout', [`geo:${params.lat.toFixed(2)},${params.lng.toFixed(2)}`])
        return []
      }
      throw err
    }

    this.metrics.timing('geo_query_duration', Date.now() - queryStart, [`geo:${params.lat.toFixed(2)},${params.lng.toFixed(2)}`])
    return rows
  }

  /**
   * Fetch portfolio media for a set of workers in one query.
   * Returns, per worker: image-only URLs (renderable thumbnails) plus a
   * combined media list (images first, then videos) for the card strip.
   * Capped at 6 items per worker.
   */
  private async fetchPortfolioMap(
    workerIds: string[],
  ): Promise<Map<string, { urls: string[]; media: Array<{ url: string; isVideo: boolean }> }>> {
    const map = new Map<string, { urls: string[]; media: Array<{ url: string; isVideo: boolean }> }>()
    if (workerIds.length === 0) return map

    const rows = await this.prisma.portfolioItem.findMany({
      where: { workerId: { in: workerIds }, type: { in: ['IMAGE', 'VIDEO'] } },
      select: { workerId: true, mediaUrl: true, type: true },
      orderBy: { createdAt: 'desc' },
    })

    // Images first, then videos (each newest-first) — so the strip leads with photos.
    const ranked = [...rows].sort((a, b) => Number(a.type === 'VIDEO') - Number(b.type === 'VIDEO'))

    for (const p of ranked) {
      const entry = map.get(p.workerId) ?? { urls: [], media: [] }
      if (entry.media.length < 6) {
        const isVideo = p.type === 'VIDEO'
        entry.media.push({ url: p.mediaUrl, isVideo })
        if (!isVideo) entry.urls.push(p.mediaUrl)
      }
      map.set(p.workerId, entry)
    }
    return map
  }

  private async getFallbackWorkers(lat: number, lng: number, specialty?: string): Promise<RawWorker[]> {
    const specialtyFilter = specialty != null
      ? Prisma.sql`AND ${specialty} = ANY(wp.specialties)`
      : Prisma.sql``

    // Same projection as queryNearbyWorkers, but with NO radius filter — so we
    // surface the nearest available workers even when they're far away, and
    // compute their real distance (NULL only when a worker has no location).
    return this.prisma.$queryRaw<RawWorker[]>(Prisma.sql`
      SELECT
        wp.id,
        wp."userId",
        wp.name,
        wp."photoUrl",
        wp.bio,
        wp.specialties,
        wp.availability::text AS availability,
        wp."experienceYears",
        wp."isVerified",
        wp.city,
        wp.state,
        wp.country,
        wp."rateRange",
        wp."rateNote",
        wp.rating,
        wp."reviewCount",
        wp."acceptsBookings",
        wp."homeServiceEnabled",
        wp."travelServiceEnabled",
        CASE
          WHEN wp.location IS NOT NULL THEN ROUND(ST_Distance(
            wp.location::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ))::integer
          ELSE NULL
        END AS "distanceMeters"
      FROM "WorkerProfile" wp
      WHERE
        wp.availability != CAST('NOT_AVAILABLE' AS "Availability")
        AND EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = wp."userId"
          AND u."isActive" = true
        )
        ${specialtyFilter}
      ORDER BY "distanceMeters" ASC NULLS LAST, wp.id DESC
      LIMIT 10
    `)
  }

  private toWorkerCardData(raw: RawWorker): WorkerCardData {
    return {
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      photoUrl: raw.photoUrl,
      bio: raw.bio,
      specialties: parsePostgresArray(raw.specialties).map(specialtyLabel),
      availability: raw.availability as Availability,
      distanceMiles: raw.distanceMeters != null
        ? Math.round((raw.distanceMeters / 1609.344) * 100) / 100
        : null,
      experienceYears: Number(raw.experienceYears),
      isVerified: Boolean(raw.isVerified),
      city: raw.city ?? null,
      state: raw.state ?? undefined,
      country: raw.country ?? undefined,
      rateRange: raw.rateRange ?? undefined,
      rateNote: raw.rateNote ?? undefined,
      rating: Number(raw.rating) > 0 ? Number(raw.rating) : undefined,
      reviewCount: Number(raw.reviewCount) > 0 ? Number(raw.reviewCount) : undefined,
      acceptsBookings: Boolean(raw.acceptsBookings),
      homeServiceEnabled: Boolean(raw.homeServiceEnabled),
      travelServiceEnabled: Boolean(raw.travelServiceEnabled),
    }
  }

  private buildCacheKey(params: FindNearbyWorkersDto, radius: number): string {
    const { lat, lng, specialty, availability, cursor } = params
    const latRound = Math.round(lat * 1000) / 1000
    const lngRound = Math.round(lng * 1000) / 1000
    return `nearby:${latRound}:${lngRound}:${radius}:${specialty ?? 'all'}:${availability ?? ''}:${cursor ?? ''}`
  }

  private encodeCursor(worker: RawWorker): string {
    // Cursors are only built from in-radius rows, which always have a distance.
    const payload: WorkerCursor = { dm: worker.distanceMeters ?? 0, id: worker.id }
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
