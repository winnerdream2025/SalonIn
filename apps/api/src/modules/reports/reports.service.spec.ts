import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { getQueueToken } from '@nestjs/bullmq'
import { ReportsService, REPORTS_QUEUE } from './reports.service'
import { PrismaService } from '../../prisma/prisma.service'

const mockPrisma = {
  user: { findFirst: jest.fn() },
  report: { findFirst: jest.fn(), create: jest.fn() },
}

const mockQueue = { add: jest.fn() }

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(REPORTS_QUEUE), useValue: mockQueue },
      ],
    }).compile()

    service = module.get<ReportsService>(ReportsService)
  })

  describe('createReport', () => {
    const REPORTER_ID = 'user-1'
    const REPORTED_USER = { id: 'user-2' }
    const DTO = { reportedUserId: 'profile-abc', type: 'FAKE_PROFILE' as const }

    it('throws BadRequestException when reporter === reported', async () => {
      await expect(
        service.createReport('same-id', { reportedUserId: 'same-id', type: 'NO_SHOW' as const }),
      ).rejects.toThrow(BadRequestException)

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when no matching user found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await expect(service.createReport(REPORTER_ID, DTO)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException on duplicate pending report', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(REPORTED_USER)
      mockPrisma.report.findFirst.mockResolvedValue({ id: 'existing-report' })

      await expect(service.createReport(REPORTER_ID, DTO)).rejects.toThrow(BadRequestException)

      expect(mockPrisma.report.create).not.toHaveBeenCalled()
    })

    it('creates report and enqueues check-suspension job on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(REPORTED_USER)
      mockPrisma.report.findFirst.mockResolvedValue(null)
      mockPrisma.report.create.mockResolvedValue({ id: 'new-report' })
      mockQueue.add.mockResolvedValue(undefined)

      await service.createReport(REPORTER_ID, DTO)

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: REPORTER_ID,
          reportedId: REPORTED_USER.id,
          type: DTO.type,
          reason: undefined,
        },
      })
      expect(mockQueue.add).toHaveBeenCalledWith('check-suspension', {
        reportedId: REPORTED_USER.id,
      })
    })

    it('passes reason to report create when provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(REPORTED_USER)
      mockPrisma.report.findFirst.mockResolvedValue(null)
      mockPrisma.report.create.mockResolvedValue({ id: 'r1' })
      mockQueue.add.mockResolvedValue(undefined)

      await service.createReport(REPORTER_ID, { ...DTO, reason: 'Impersonating someone' })

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reason: 'Impersonating someone' }),
      })
    })

    it('uses flexible OR lookup — accepts WorkerProfile.id as reportedUserId', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(REPORTED_USER)
      mockPrisma.report.findFirst.mockResolvedValue(null)
      mockPrisma.report.create.mockResolvedValue({ id: 'r1' })
      mockQueue.add.mockResolvedValue(undefined)

      await service.createReport(REPORTER_ID, DTO)

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: DTO.reportedUserId },
            { workerProfile: { id: DTO.reportedUserId } },
            { salonProfile: { id: DTO.reportedUserId } },
          ],
        },
        select: { id: true },
      })
    })
  })
})
