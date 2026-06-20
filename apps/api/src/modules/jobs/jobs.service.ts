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
    const radiusMiles = dto.radiusMiles ?? 50

    // If lat/lng provided, use geo-based query with radius expansion
    if (dto.lat != null && dto.lng != null) {
      const RADIUS_STEPS = [50, 100, 200, 500]
      let result: PaginatedResponse<JobPostCardData> | null = null

      // Only expand radius on first page (not pagination)
      if (page === 1) {
        for (const radius of RADIUS_STEPS) {
          if (radius < radiusMiles) continue
          result = await this.listByGeo(dto.lat, dto.lng, radius, dto, page, limit)
          if (result.total > 0) break
        }
      } else {
        result = await this.listByGeo(dto.lat, dto.lng, radiusMiles, dto, page, limit)
      }

      // If geo still returns 0, fall back to non-geo query (never return empty)
      if (result && result.total > 0) {
        return result
      }
      // Fall through to non-geo query
    }

    // Fallback to non-geo query (backward compatibility or when geo returns 0)
    const where = {
      ...(dto.cityId ? { cityId: dto.cityId } : {}),
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
      data: rows.map((r) => this.toJobPostCardData(r)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    }
  }

  private async listByGeo(
    lat: number,
    lng: number,
    radiusMiles: number,
    dto: ListJobsDto,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<JobPostCardData>> {
    const radiusMeters = radiusMiles * 1609.344
    const offset = (page - 1) * limit

    // Build parameterized query with dynamic filters
    // Parameters: $1=lng, $2=lat, $3=radius, $4=limit, $5=offset
    // Optional filters start at $6
    const params: (string | number)[] = [lng, lat, radiusMeters, limit, offset]
    const filters: string[] = []
    
    if (dto.specialty) {
      params.push(dto.specialty)
      filters.push(`AND jp.specialty = $${params.length}`)
    }
    if (dto.type) {
      params.push(dto.type)
      filters.push(`AND jp.type = $${params.length}`)
    }
    if (dto.listingType) {
      params.push(dto.listingType)
      filters.push(`AND jp."listingType" = $${params.length}`)
    }
    if (dto.salonId) {
      params.push(dto.salonId)
      filters.push(`AND jp."salonId" = $${params.length}`)
    }

    const filterClause = filters.join('\n          ')

    const query = `
      WITH nearby_jobs AS (
        SELECT
          jp.id,
          jp.title,
          jp.description,
          jp.specialty,
          jp."payStructure",
          jp.type,
          jp."listingType",
          jp."isUrgent",
          jp."cityId",
          jp."expiresAt",
          jp."spaceSize",
          jp."spaceAmenities",
          jp."spacePhotos",
          jp."rentalDeposit",
          jp."availableFrom",
          sp.id AS "salonId",
          sp.name AS "salonName",
          sp."photoUrls" AS "salonPhotoUrls",
          sp."isVerified" AS "salonVerified",
          sp.rating AS "salonRating",
          sp."reviewCount" AS "salonReviewCount",
          ROUND(ST_Distance(
            sp.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) / 1609.344)::integer AS "distanceMiles",
          (SELECT COUNT(*) FROM "JobPost" WHERE "salonId" = sp.id AND "isActive" = true) AS "salonHiringCount",
          (SELECT COUNT(*) FROM "JobApplication" WHERE "jobId" = jp.id) AS "applicantCount"
        FROM "JobPost" jp
        JOIN "SalonProfile" sp ON jp."salonId" = sp.id
        WHERE
          jp."isActive" = true
          AND jp."expiresAt" > NOW()
          AND sp.location IS NOT NULL
          AND ST_DWithin(
            sp.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
          ${filterClause}
      )
      SELECT *, (SELECT COUNT(*) FROM nearby_jobs) AS total_count
      FROM nearby_jobs
      ORDER BY "isUrgent" DESC, "distanceMiles" ASC, id DESC
      LIMIT $4 OFFSET $5
    `

    type RawJobRow = {
      id: string
      title: string
      description: string
      specialty: string
      payStructure: string
      type: string
      listingType: string
      isUrgent: boolean
      cityId: string
      expiresAt: Date
      spaceSize: string | null
      spaceAmenities: string[]
      spacePhotos: string[]
      rentalDeposit: number | null
      availableFrom: Date | null
      salonId: string
      salonName: string
      salonPhotoUrls: string[]
      salonVerified: boolean
      salonRating: number
      salonReviewCount: number
      distanceMiles: number
      salonHiringCount: string
      applicantCount: string
      total_count: string
    }

    const rows = await this.prisma.$queryRawUnsafe<RawJobRow[]>(query, ...params)

    const total = rows.length > 0 ? parseInt(rows[0]!.total_count, 10) : 0

    return {
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        specialty: r.specialty,
        payStructure: r.payStructure,
        type: r.type as JobPostCardData['type'],
        listingType: r.listingType as JobPostCardData['listingType'],
        isUrgent: r.isUrgent,
        cityId: r.cityId,
        expiresAt: r.expiresAt.toISOString(),
        salonId: r.salonId,
        salonName: r.salonName,
        salonPhotoUrl: r.salonPhotoUrls[0] ?? null,
        salonCoverUrl: r.salonPhotoUrls[1] ?? r.salonPhotoUrls[0] ?? null,
        salonVerified: r.salonVerified,
        salonRating: r.salonRating > 0 ? r.salonRating : undefined,
        salonReviewCount: r.salonReviewCount > 0 ? r.salonReviewCount : undefined,
        salonHiringCount: parseInt(r.salonHiringCount, 10),
        applicantCount: parseInt(r.applicantCount, 10),
        portfolioPhotoUrls: r.salonPhotoUrls.slice(0, 6),
        spaceSize: r.spaceSize ?? undefined,
        spaceAmenities: r.spaceAmenities.length > 0 ? r.spaceAmenities : undefined,
        spacePhotos: r.spacePhotos.length > 0 ? r.spacePhotos : undefined,
        rentalDeposit: r.rentalDeposit ?? undefined,
        availableFrom: r.availableFrom?.toISOString() ?? undefined,
        distanceMiles: r.distanceMiles,
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    }
  }

  private toJobPostCardData(r: {
    id: string
    title: string
    description: string
    specialty: string
    payStructure: string
    type: string
    listingType: string
    isUrgent: boolean
    cityId: string
    expiresAt: Date
    spaceSize: string | null
    spaceAmenities: string[]
    spacePhotos: string[]
    rentalDeposit: number | null
    availableFrom: Date | null
    salon: {
      id: string
      name: string
      photoUrls: string[]
      cityId: string
      isVerified: boolean
      rating: number
      reviewCount: number
      _count: { jobPosts: number }
    }
    _count: { applications: number }
  }): JobPostCardData {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      specialty: r.specialty,
      payStructure: r.payStructure,
      type: r.type as JobPostCardData['type'],
      listingType: r.listingType as JobPostCardData['listingType'],
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

  async toggleSave(jobId: string, userId: string): Promise<{ saved: boolean }> {
    const existing = await this.prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    })
    if (existing) {
      await this.prisma.savedJob.delete({ where: { id: existing.id } })
      return { saved: false }
    }
    const job = await this.prisma.jobPost.findFirst({ where: { id: jobId, isActive: true } })
    if (!job) throw new NotFoundException('Job post not found')
    await this.prisma.savedJob.create({ data: { userId, jobId } })
    return { saved: true }
  }

  async getSavedJobIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedJob.findMany({
      where: { userId },
      select: { jobId: true },
    })
    return rows.map((r: { jobId: string }) => r.jobId)
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
