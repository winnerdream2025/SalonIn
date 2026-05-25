import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import type { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto'
import type { UpdateAvailabilityDto } from './dto/update-availability.dto'
import type { UpdateLocationDto } from './dto/update-location.dto'
import type { AddPortfolioItemDto } from './dto/add-portfolio-item.dto'

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getProfile(id: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, role: true, createdAt: true } },
        portfolioItems: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!profile) throw new NotFoundException('Worker not found')
    return profile
  }

  async updateProfile(userId: string, dto: UpdateWorkerProfileDto) {
    await this.assertExists(userId)
    return this.prisma.workerProfile.update({
      where: { userId },
      data: { ...dto },
    })
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true, cityId: true },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    const updated = await this.prisma.workerProfile.update({
      where: { userId },
      data: { availability: dto.availability },
    })
    await this.redis.delByPattern(`nearby:${profile.cityId}:*`)
    return updated
  }

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<void> {
    await this.assertExists(userId)
    await this.prisma.$executeRaw`
      UPDATE "WorkerProfile"
      SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
      WHERE "userId" = ${userId}
    `
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, role: true, createdAt: true } },
        portfolioItems: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    return profile
  }

  async addPortfolioItem(userId: string, dto: AddPortfolioItemDto) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    return this.prisma.portfolioItem.create({
      data: {
        workerId: profile.id,
        mediaUrl: dto.mediaUrl,
        type: dto.type,
        caption: dto.caption,
      },
    })
  }

  private async assertExists(userId: string): Promise<void> {
    const exists = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!exists) throw new NotFoundException('Worker profile not found')
  }
}
