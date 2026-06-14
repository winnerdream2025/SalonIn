import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
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
  private readonly logger = new Logger(JobsService.name)

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
        listingType: dto.listingType ?? 'JOB',
        isUrgent: dto.isUrgent ?? false,
        cityId: dto.cityId,
        expiresAt: new Date(dto.expiresAt),
        spacePhotos: dto.spacePhotos ?? [],
        spaceSize: dto.spaceSize,
        spaceAmenities: dto.spaceAmenities ?? [],
        rentalDeposit: dto.rentalDeposit,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
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
    this.notificationsService.notifyNewJobPost(workerIds, dto.title, salon.name, post.id).catch(() => {})

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
      ...(dto.listingType ? { listingType: dto.listingType } : {}),
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.jobPost.findMany({
        where,
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              photoUrls: true,
              cityId: true,
              isVerified: true,
              rating: true,
              reviewCount: true,
              _count: { select: { jobPosts: { where: { isActive: true } } } },
            },
          },
          _count: { select: { applications: true } },
        },
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
        description: r.description,
        specialty: r.specialty,
        payStructure: r.payStructure,
        type: r.type,
        listingType: r.listingType,
        isUrgent: r.isUrgent,
        cityId: r.cityId,
        expiresAt: r.expiresAt.toISOString(),
        salonId: r.salon.id,
        salonName: r.salon.name,
        salonPhotoUrl: r.salon.photoUrls[0] ?? null,
        salonCoverUrl: r.salon.photoUrls[1] ?? r.salon.photoUrls[0] ?? null,
        salonVerified: r.salon.isVerified,
        salonRating: r.salon.rating > 0 ? r.salon.rating : undefined,
        salonReviewCount: r.salon.reviewCount > 0 ? r.salon.reviewCount : undefined,
        salonHiringCount: r.salon._count.jobPosts,
        applicantCount: r._count.applications,
        portfolioPhotoUrls: r.salon.photoUrls.slice(0, 6),
        spaceSize: r.spaceSize ?? undefined,
        spaceAmenities: r.spaceAmenities.length > 0 ? r.spaceAmenities : undefined,
        spacePhotos: r.spacePhotos.length > 0 ? r.spacePhotos : undefined,
        rentalDeposit: r.rentalDeposit ?? undefined,
        availableFrom: r.availableFrom?.toISOString() ?? undefined,
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
        salon: {
          select: {
            name: true,
            photoUrls: true,
            description: true,
            cityId: true,
            userId: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
          },
        },
        _count: { select: { applications: true } },
      },
    })
    if (!post) throw new NotFoundException('Job post not found')
    const { salon, _count, ...rest } = post
    return {
      ...rest,
      salon: {
        name: salon.name,
        photoUrls: salon.photoUrls,
        description: salon.description,
        cityId: salon.cityId,
        userId: salon.userId,
        isVerified: salon.isVerified,
        rating: salon.rating,
        reviewCount: salon.reviewCount,
      },
      applicantCount: _count.applications,
    }
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
    if (existing) throw new ConflictException('Already applied to this job')

    await this.prisma.jobApplication.create({
      data: { jobId, workerId: worker.id },
    })

    this.notificationsService
      .notifyNewApplication(job.salon.userId, worker.name, job.id, job.title)
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
      include: { worker: { select: { userId: true, name: true } } },
    })
    if (!app) throw new NotFoundException('Application not found')

    const updated = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: dto.status },
    })

    if (dto.status === 'ACCEPTED' || dto.status === 'DECLINED') {
      const job = await this.prisma.jobPost.findUnique({
        where: { id: jobId },
        include: { salon: { select: { name: true } } },
      })
      if (job) {
        if (dto.status === 'ACCEPTED') {
          this.notificationsService
            .notifyApplicationAccepted(app.worker.userId, job.salon.name, jobId, job.title)
            .catch(() => {})
        } else {
          this.notificationsService
            .notifyApplicationDeclined(app.worker.userId, job.salon.name, jobId, job.title)
            .catch(() => {})
        }
      }
    }

    return updated
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
        ...(dto.listingType !== undefined && { listingType: dto.listingType }),
        ...(dto.isUrgent !== undefined && { isUrgent: dto.isUrgent }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.spacePhotos !== undefined && { spacePhotos: dto.spacePhotos }),
        ...(dto.spaceSize !== undefined && { spaceSize: dto.spaceSize }),
        ...(dto.spaceAmenities !== undefined && { spaceAmenities: dto.spaceAmenities }),
        ...(dto.rentalDeposit !== undefined && { rentalDeposit: dto.rentalDeposit }),
        ...(dto.availableFrom !== undefined && { availableFrom: new Date(dto.availableFrom) }),
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredJobs(): Promise<void> {
    const result = await this.prisma.jobPost.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false },
    })
    this.logger.log(`cleanupExpiredJobs: deactivated ${result.count} expired jobs`)
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
