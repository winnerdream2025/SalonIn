import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Availability } from '@salonin/types'
import type { WorkerCardData, CursorResponse } from '@salonin/types'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { MetricsService } from '../../common/metrics/metrics.service'
import type { FindNearbyWorkersDto } from './dto/find-nearby-workers.dto'

interface RawWorker {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[] | string
  availability: string
  experienceYears: number
  isVerified: boolean
  cityId: string
  distanceMeters: number
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
    const cacheKey = this.buildCacheKey(params)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.metrics.increment('cache.hit', [`city:${params.cityId}`])
      return JSON.parse(cached) as CursorResponse<WorkerCardData>
    }
    this.metrics.increment('cache.miss', [`city:${params.cityId}`])

    const radiusMeters = params.radiusMiles * 1609.344
    const cursor = params.cursor ? this.decodeCursor(params.cursor) : null

    const availFilter = params.availability != null
      ? Prisma.sql`AND wp.availability = CAST(${params.availability} AS "Availability")`
      : Prisma.sql``

    const specialtyFilter = params.specialty != null
      ? Prisma.sql`AND ${params.specialty} = ANY(wp.specialties)`
      : Prisma.sql``

    const cursorFilter = cursor != null
      ? Prisma.sql`WHERE "distanceMeters" > ${cursor.dm}
          OR ("distanceMeters" = ${cursor.dm} AND id > ${cursor.id})`
      : Prisma.sql``

    const queryStart = Date.now()
    const rows = await this.prisma.$queryRaw<RawWorker[]>(Prisma.sql`
      WITH distances AS (
        SELECT
          wp.id,
          wp.name,
          wp."photoUrl",
          wp.specialties,
          wp.availability::text AS availability,
          wp."experienceYears",
          wp."isVerified",
          wp."cityId",
          ROUND(ST_Distance(
            wp.location::geography,
            ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
          ))::integer AS "distanceMeters"
        FROM "WorkerProfile" wp
        WHERE
          wp."cityId" = ${params.cityId}
          AND wp.location IS NOT NULL
          AND ST_DWithin(
            wp.location::geography,
            ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
            ${radiusMeters}
          )
          ${availFilter}
          ${specialtyFilter}
      )
      SELECT * FROM distances
      ${cursorFilter}
      ORDER BY "distanceMeters" ASC, id ASC
      LIMIT 51
    `)

    this.metrics.timing('geo_query_duration', Date.now() - queryStart, [`city:${params.cityId}`])

    const hasMore = rows.length > 50
    const slice = rows.slice(0, 50)
    const nextCursor = hasMore ? this.encodeCursor(slice[49]!) : null

    const result: CursorResponse<WorkerCardData> = {
      data: slice.map((r) => this.toWorkerCardData(r)),
      nextCursor,
      hasMore,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 60)

    this.metrics.gauge('active_workers_by_city', result.data.length, [`city:${params.cityId}`])

    return result
  }

  private toWorkerCardData(raw: RawWorker): WorkerCardData {
    return {
      id: raw.id,
      name: raw.name,
      photoUrl: raw.photoUrl,
      specialties: parsePostgresArray(raw.specialties),
      availability: raw.availability as Availability,
      distanceMiles: Math.round((raw.distanceMeters / 1609.344) * 100) / 100,
      experienceYears: Number(raw.experienceYears),
      isVerified: Boolean(raw.isVerified),
      cityId: raw.cityId,
    }
  }

  private buildCacheKey(params: FindNearbyWorkersDto): string {
    const { cityId, lat, lng, radiusMiles, specialty, availability, cursor } = params
    return `nearby:${cityId}:${lat}:${lng}:${radiusMiles}:${specialty ?? ''}:${availability ?? ''}:${cursor ?? ''}`
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
