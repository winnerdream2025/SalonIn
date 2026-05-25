import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { JobsService } from './jobs.service'
import { PrismaService } from '../../prisma/prisma.service'

const mockPrisma = {
  salonProfile: { findUnique: jest.fn() },
  jobPost: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

const BASE_DTO = {
  title: 'Hair Stylist',
  description: 'Looking for experienced hair stylist',
  specialty: 'Haircut',
  payStructure: '$500/week',
  type: 'FULL_TIME' as const,
  cityId: 'dmv',
  expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
}

const USER_ID = 'user-salon-1'
const SALON = { id: 'salon-1' }

describe('JobsService', () => {
  let service: JobsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<JobsService>(JobsService)
  })

  describe('create', () => {
    it('throws ForbiddenException when no salon profile exists', async () => {
      mockPrisma.salonProfile.findUnique.mockResolvedValue(null)

      await expect(service.create(USER_ID, BASE_DTO)).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.jobPost.create).not.toHaveBeenCalled()
    })

    it('creates job post when salon profile exists', async () => {
      mockPrisma.salonProfile.findUnique.mockResolvedValue(SALON)
      mockPrisma.jobPost.create.mockResolvedValue({ id: 'job-1', ...BASE_DTO, salonId: SALON.id })

      await service.create(USER_ID, BASE_DTO)

      expect(mockPrisma.jobPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          salonId: SALON.id,
          title: BASE_DTO.title,
          specialty: BASE_DTO.specialty,
          isUrgent: false,
        }),
      })
    })

    it('passes isUrgent=true when set in dto', async () => {
      mockPrisma.salonProfile.findUnique.mockResolvedValue(SALON)
      mockPrisma.jobPost.create.mockResolvedValue({ id: 'job-2' })

      await service.create(USER_ID, { ...BASE_DTO, isUrgent: true })

      expect(mockPrisma.jobPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isUrgent: true }),
      })
    })
  })

  describe('getById', () => {
    it('throws NotFoundException when job not found', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(null)

      await expect(service.getById('missing-id')).rejects.toThrow(NotFoundException)
    })

    it('returns job post with salon when found', async () => {
      const post = { id: 'job-1', salon: { name: 'Glamour Studio', photoUrls: [] } }
      mockPrisma.jobPost.findUnique.mockResolvedValue(post)

      const result = await service.getById('job-1')

      expect(result).toEqual(post)
    })
  })

  describe('remove', () => {
    it('throws NotFoundException when job not found', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(null)

      await expect(service.remove('missing-id', USER_ID)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when caller does not own the job', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue({
        salon: { userId: 'other-user' },
      })

      await expect(service.remove('job-1', USER_ID)).rejects.toThrow(ForbiddenException)
    })

    it('soft-deletes job by setting isActive=false', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue({ salon: { userId: USER_ID } })
      mockPrisma.jobPost.update.mockResolvedValue(undefined)

      await service.remove('job-1', USER_ID)

      expect(mockPrisma.jobPost.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { isActive: false },
      })
    })
  })

  describe('update', () => {
    it('throws NotFoundException when job not found', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue(null)

      await expect(service.update('missing-id', USER_ID, { title: 'New Title' })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws ForbiddenException when caller does not own the job', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue({ salon: { userId: 'other-user' } })

      await expect(service.update('job-1', USER_ID, {})).rejects.toThrow(ForbiddenException)
    })

    it('updates only provided fields', async () => {
      mockPrisma.jobPost.findUnique.mockResolvedValue({ salon: { userId: USER_ID } })
      mockPrisma.jobPost.update.mockResolvedValue(undefined)

      await service.update('job-1', USER_ID, { title: 'Updated Title' })

      const call = mockPrisma.jobPost.update.mock.calls[0] as [{ where: unknown; data: Record<string, unknown> }]
      expect(call[0].data).toHaveProperty('title', 'Updated Title')
      expect(call[0].data).not.toHaveProperty('specialty')
    })
  })
})
