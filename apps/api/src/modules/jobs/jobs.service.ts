import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { JobPostCardData, PaginatedResponse } from '@salonin/types'
import type { CreateJobPostDto } from './dto/create-job-post.dto'
import type { UpdateJobPostDto } from './dto/update-job-post.dto'
import type { ListJobsDto } from './dto/list-jobs.dto'
import type { UpdateApplicationStatusDto } from './dto/update-application-status.dto'
import { Availability } from '@prisma/client'

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateJobPostDto) {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
      select: { id: true, name: true },
    })
    if (!salon) throw new ForbiddenException('Salon profile required to create job posts')

    const post = await this.prisma.jobPost.create({
      data: {
        salonId: salon.id,
        title: dto.title,
        description: dto.description,
        specialty: dto.specialty,
        payStructure: dto.payStructure,
        type: dto.type,
        isUrgent: dto.isUrgent ?? false,
        cityId: dto.cityId,
        expiresAt: new Date(dto.expiresAt),
      },
    })

    const nearbyWorkers = await this.prisma.workerProfile.findMany({
      where: {
        cityId: dto.cityId,
        user: { isActive: true },
        availability: { not: Availability.NOT_AVAILABLE },
      },
      select: { userId: true },
    })
    const workerIds = nearbyWorkers.map((w) => w.userId)
    this.notificationsService.notifyNewJobPost(workerIds, dto.title, salon.name).catch(() => {})

    return post
  }

  async list(dto: ListJobsDto): Promise<PaginatedResponse<JobPostCardData>> {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 20

    const where = {
      cityId: dto.cityId,
      isActive: true,
      expiresAt: { gt: new Date() },
      ...(dto.salonId ? { salonId: dto.salonId } : {}),
      ...(dto.specialty ? { specialty: dto.specialty } : {}),
      ...(dto.type ? { type: dto.type } : {}),
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.jobPost.findMany({
        where,
        include: { salon: { select: { name: true, photoUrls: true } } },
        orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jobPost.count({ where }),
    ])

    return {
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        specialty: r.specialty,
        payStructure: r.payStructure,
        type: r.type,
        isUrgent: r.isUrgent,
        cityId: r.cityId,
        expiresAt: r.expiresAt.toISOString(),
        salonName: r.salon.name,
        salonPhotoUrl: r.salon.photoUrls[0] ?? null,
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    }
  }

  async getById(id: string) {
    const post = await this.prisma.jobPost.findFirst({
      where: { id, isActive: true },
      include: {
        salon: { select: { name: true, photoUrls: true, description: true, cityId: true, userId: true } },
        _count: { select: { applications: true } },
      },
    })
    if (!post) throw new NotFoundException('Job post not found')
    return post
  }

  async applyToJob(jobId: string, userId: string): Promise<{ success: true }> {
    const job = await this.prisma.jobPost.findFirst({
      where: { id: jobId, isActive: true },
      include: { salon: { select: { userId: true } } },
    })
    if (!job) throw new NotFoundException('Job post not found')

    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true, name: true },
    })
    if (!worker) throw new ForbiddenException('Worker profile required to apply')

    const existing = await this.prisma.jobApplication.findFirst({
      where: { jobId, workerId: worker.id },
    })
    if (existing) return { success: true }

    await this.prisma.jobApplication.create({
      data: { jobId, workerId: worker.id },
    })

    this.notificationsService
      .sendPush(job.salon.userId, 'New applicant', `${worker.name} applied`)
      .catch(() => {})

    return { success: true }
  }

  async getApplicants(jobId: string, userId: string) {
    await this.assertOwnership(jobId, userId)
    return this.prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            specialties: true,
            availability: true,
            isVerified: true,
            cityId: true,
            experienceYears: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateApplicationStatus(
    jobId: string,
    applicationId: string,
    userId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    await this.assertOwnership(jobId, userId)
    const app = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, jobId },
    })
    if (!app) throw new NotFoundException('Application not found')
    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: dto.status },
    })
  }

  async update(id: string, userId: string, dto: UpdateJobPostDto) {
    await this.assertOwnership(id, userId)
    return this.prisma.jobPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.payStructure !== undefined && { payStructure: dto.payStructure }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.isUrgent !== undefined && { isUrgent: dto.isUrgent }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
      },
    })
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.assertOwnership(id, userId)
    await this.prisma.jobPost.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async assertOwnership(id: string, userId: string): Promise<void> {
    const post = await this.prisma.jobPost.findUnique({
      where: { id },
      select: { salon: { select: { userId: true } } },
    })
    if (!post) throw new NotFoundException('Job post not found')
    if (post.salon.userId !== userId) throw new ForbiddenException('Not authorized')
  }
}
