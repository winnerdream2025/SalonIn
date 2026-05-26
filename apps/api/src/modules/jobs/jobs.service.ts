import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { JobPostCardData, PaginatedResponse } from '@salonin/types'
import type { CreateJobPostDto } from './dto/create-job-post.dto'
import type { UpdateJobPostDto } from './dto/update-job-post.dto'
import type { ListJobsDto } from './dto/list-jobs.dto'

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateJobPostDto) {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!salon) throw new ForbiddenException('Salon profile required to create job posts')

    return this.prisma.jobPost.create({
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
    const post = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        salon: { select: { name: true, photoUrls: true, description: true, cityId: true } },
      },
    })
    if (!post) throw new NotFoundException('Job post not found')
    return post
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
