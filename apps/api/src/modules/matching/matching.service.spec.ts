import { Test, TestingModule } from '@nestjs/testing'
import { MatchingService } from './matching.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { MetricsService } from '../../common/metrics/metrics.service'

const mockPrisma = {
  $queryRaw: jest.fn(),
}

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
}

const mockMetrics = {
  timing: jest.fn(),
  increment: jest.fn(),
  gauge: jest.fn(),
}

function makeRawWorker(overrides: Partial<{
  id: string
  name: string
  photoUrl: string | null
  specialties: string[] | string
  availability: string
  experienceYears: number
  isVerified: boolean
  cityId: string
  distanceMeters: number
}> = {}) {
  return {
    id: 'worker-1',
    name: 'Alice Smith',
    photoUrl: null,
    specialties: [] as string[],
    availability: 'NOW',
    experienceYears: 3,
    isVerified: false,
    cityId: 'dmv',
    distanceMeters: 1000,
    ...overrides,
  }
}

const BASE_PARAMS = {
  lat: 38.9072,
  lng: -77.0369,
  radiusMiles: 10,
  cityId: 'dmv',
}

describe('MatchingService', () => {
  let service: MatchingService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile()

    service = module.get<MatchingService>(MatchingService)
  })

  describe('findNearbyWorkers', () => {
    describe('cache behaviour', () => {
      it('returns cached result without hitting DB', async () => {
        const cached = { data: [makeRawWorker()], nextCursor: null, hasMore: false }
        mockRedis.get.mockResolvedValue(JSON.stringify(cached))

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result).toEqual(cached)
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
      })

      it('queries DB on cache miss and stores result', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([])

        await service.findNearbyWorkers(BASE_PARAMS)

        expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1)
        expect(mockRedis.set).toHaveBeenCalledTimes(1)
        const [, serialized, , ttl] = mockRedis.set.mock.calls[0] as [string, string, string, number]
        expect(ttl).toBe(60)
        expect(() => JSON.parse(serialized)).not.toThrow()
      })
    })

    describe('pagination', () => {
      it('returns hasMore=false and nextCursor=null when ≤50 rows', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue(
          Array.from({ length: 5 }, (_, i) => makeRawWorker({ id: `w${i}`, distanceMeters: i * 100 })),
        )

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.hasMore).toBe(false)
        expect(result.nextCursor).toBeNull()
        expect(result.data).toHaveLength(5)
      })

      it('returns hasMore=true and nextCursor when 51 rows returned', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue(
          Array.from({ length: 51 }, (_, i) =>
            makeRawWorker({ id: `w${i}`, distanceMeters: (i + 1) * 50 }),
          ),
        )

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.hasMore).toBe(true)
        expect(result.nextCursor).not.toBeNull()
        expect(result.data).toHaveLength(50)
      })

      it('nextCursor is a valid base64 payload with dm and id', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        const rows = Array.from({ length: 51 }, (_, i) =>
          makeRawWorker({ id: `worker-${i}`, distanceMeters: i * 100 }),
        )
        mockPrisma.$queryRaw.mockResolvedValue(rows)

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        const decoded = JSON.parse(Buffer.from(result.nextCursor!, 'base64').toString('utf-8')) as {
          dm: number
          id: string
        }
        expect(typeof decoded.dm).toBe('number')
        expect(typeof decoded.id).toBe('string')
        expect(decoded.id).toBe('worker-49')
      })
    })

    describe('data mapping', () => {
      it('converts distanceMeters to distanceMiles', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([makeRawWorker({ distanceMeters: 1609 })])

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.data[0]?.distanceMiles).toBeCloseTo(1.0, 1)
      })

      it('parses PostgreSQL array string format for specialties', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([
          makeRawWorker({ specialties: '{Haircut,"Color",Braids}' }),
        ])

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.data[0]?.specialties).toEqual(['Haircut', 'Color', 'Braids'])
      })

      it('handles native JS array specialties', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([
          makeRawWorker({ specialties: ['Locs', 'Extensions'] }),
        ])

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.data[0]?.specialties).toEqual(['Locs', 'Extensions'])
      })

      it('handles empty PostgreSQL array {}', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([makeRawWorker({ specialties: '{}' })])

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.data[0]?.specialties).toEqual([])
      })

      it('casts isVerified to boolean', async () => {
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockPrisma.$queryRaw.mockResolvedValue([makeRawWorker({ isVerified: true })])

        const result = await service.findNearbyWorkers(BASE_PARAMS)

        expect(result.data[0]?.isVerified).toBe(true)
      })
    })
  })
})
