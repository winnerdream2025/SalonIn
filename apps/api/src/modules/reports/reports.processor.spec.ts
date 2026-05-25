import { Test, TestingModule } from '@nestjs/testing'
import { Job } from 'bullmq'
import { ReportsProcessor } from './reports.processor'
import { PrismaService } from '../../prisma/prisma.service'

const mockPrisma = {
  report: { count: jest.fn() },
  user: { update: jest.fn() },
}

function makeJob(reportedId: string): Job<{ reportedId: string }> {
  return { data: { reportedId } } as Job<{ reportedId: string }>
}

describe('ReportsProcessor', () => {
  let processor: ReportsProcessor

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsProcessor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    processor = module.get<ReportsProcessor>(ReportsProcessor)
  })

  describe('process', () => {
    const REPORTED_ID = 'user-reported'

    it('does not suspend user when report count is below threshold', async () => {
      mockPrisma.report.count.mockResolvedValue(2)

      await processor.process(makeJob(REPORTED_ID))

      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('suspends user when report count reaches threshold (3)', async () => {
      mockPrisma.report.count.mockResolvedValue(3)
      mockPrisma.user.update.mockResolvedValue(undefined)

      await processor.process(makeJob(REPORTED_ID))

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: REPORTED_ID },
        data: { isActive: false },
      })
    })

    it('suspends user when report count exceeds threshold (>3)', async () => {
      mockPrisma.report.count.mockResolvedValue(7)
      mockPrisma.user.update.mockResolvedValue(undefined)

      await processor.process(makeJob(REPORTED_ID))

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
    })

    it('counts only PENDING reports', async () => {
      mockPrisma.report.count.mockResolvedValue(0)

      await processor.process(makeJob(REPORTED_ID))

      expect(mockPrisma.report.count).toHaveBeenCalledWith({
        where: { reportedId: REPORTED_ID, status: 'PENDING' },
      })
    })
  })
})
