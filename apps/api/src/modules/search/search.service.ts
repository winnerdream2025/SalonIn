import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { SearchDto } from './dto/search.dto'

const DEFAULT_LIMIT = 20

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchDto) {
    const type = dto.type ?? 'all'
    const limit = dto.limit ?? DEFAULT_LIMIT
    const page = dto.page ?? 1
    const skip = (page - 1) * limit

    const [workers, salons, services, jobs] = await Promise.all([
      (type === 'workers' || type === 'all') ? this.searchWorkers(dto, skip, limit) : null,
      (type === 'salons' || type === 'all') ? this.searchSalons(dto, skip, limit) : null,
      (type === 'services' || type === 'all') ? this.searchServices(dto, skip, limit) : null,
      (type === 'jobs' || type === 'all') ? this.searchJobs(dto, skip, limit) : null,
    ])

    if (type !== 'all') {
      const result = { workers, salons, services, jobs }[type]
      return { type, page, limit, ...result }
    }

    return {
      type: 'all',
      page,
      limit,
      workers: workers ?? { data: [], total: 0 },
      salons: salons ?? { data: [], total: 0 },
      services: services ?? { data: [], total: 0 },
      jobs: jobs ?? { data: [], total: 0 },
    }
  }

  // ─── Workers ──────────────────────────────────────────────────────────────

  private async searchWorkers(dto: SearchDto, skip: number, take: number) {
    const where: any = { user: { isActive: true } }

    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { bio: { contains: dto.q, mode: 'insensitive' } },
      ]
    }
    if (dto.specialty) {
      where.specialties = { has: dto.specialty }
    }
    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' }
    }
    if (dto.state) {
      where.state = { contains: dto.state, mode: 'insensitive' }
    }
    if (dto.rating) {
      where.rating = { gte: dto.rating }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workerProfile.findMany({
        where,
        skip,
        take,
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
        select: {
          id: true,
          name: true,
          photoUrl: true,
          bio: true,
          specialties: true,
          availability: true,
          rating: true,
          reviewCount: true,
          isVerified: true,
          city: true,
          state: true,
          user: { select: { id: true, followersCount: true } },
        },
      }),
      this.prisma.workerProfile.count({ where }),
    ])

    return { data, total, hasMore: skip + take < total }
  }

  // ─── Salons ───────────────────────────────────────────────────────────────

  private async searchSalons(dto: SearchDto, skip: number, take: number) {
    const where: any = { user: { isActive: true } }

    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ]
    }
    if (dto.specialty) {
      where.specialties = { has: dto.specialty }
    }
    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' }
    }
    if (dto.state) {
      where.state = { contains: dto.state, mode: 'insensitive' }
    }
    if (dto.rating) {
      where.rating = { gte: dto.rating }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salonProfile.findMany({
        where,
        skip,
        take,
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
        select: {
          id: true,
          name: true,
          photoUrls: true,
          description: true,
          specialties: true,
          rating: true,
          reviewCount: true,
          isVerified: true,
          city: true,
          state: true,
          isHiring: true,
          user: { select: { id: true, followersCount: true } },
        },
      }),
      this.prisma.salonProfile.count({ where }),
    ])

    return { data, total, hasMore: skip + take < total }
  }

  // ─── Provider Services ────────────────────────────────────────────────────

  private async searchServices(dto: SearchDto, skip: number, take: number) {
    const where: any = { isActive: true }

    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
        { category: { contains: dto.q, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.providerService.findMany({
        where,
        skip,
        take,
        orderBy: { price: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          category: true,
          currency: true,
          providerId: true,
          providerType: true,
        },
      }),
      this.prisma.providerService.count({ where }),
    ])

    return { data, total, hasMore: skip + take < total }
  }

  // ─── Job Posts ────────────────────────────────────────────────────────────

  private async searchJobs(dto: SearchDto, skip: number, take: number) {
    const where: any = { isActive: true }

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ]
    }
    if (dto.specialty) {
      where.specialty = { contains: dto.specialty, mode: 'insensitive' }
    }
    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' }
    }
    if (dto.state) {
      where.state = { contains: dto.state, mode: 'insensitive' }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobPost.findMany({
        where,
        skip,
        take,
        orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          specialty: true,
          type: true,
          listingType: true,
          payStructure: true,
          isUrgent: true,
          city: true,
          state: true,
          createdAt: true,
          expiresAt: true,
          salon: {
            select: {
              id: true,
              name: true,
              photoUrls: true,
              isVerified: true,
              rating: true,
            },
          },
        },
      }),
      this.prisma.jobPost.count({ where }),
    ])

    return { data, total, hasMore: skip + take < total }
  }
}
