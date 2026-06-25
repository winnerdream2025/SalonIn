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
        user: { select: { role: true, createdAt: true, followersCount: true, followingCount: true } },
        portfolioItems: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!profile) throw new NotFoundException('Worker not found')
    return {
      ...profile,
      followersCount: profile.user.followersCount,
      followingCount: profile.user.followingCount,
    }
  }

  async updateProfile(userId: string, dto: UpdateWorkerProfileDto) {
    await this.assertExists(userId)
    const updated = await this.prisma.workerProfile.update({
      where: { userId },
      data: { ...dto },
    })
    if (dto.availability != null) {
      await this.redis.delByPattern(`nearby:*`)
    }
    return updated
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    const updated = await this.prisma.workerProfile.update({
      where: { userId },
      data: { availability: dto.availability },
    })
    await this.redis.delByPattern(`nearby:*`)
    return updated
  }

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<void> {
    await this.assertExists(userId)
    await this.prisma.$executeRaw`
      UPDATE "WorkerProfile"
      SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
          city = ${dto.city ?? null},
          state = ${dto.state ?? null},
          country = ${dto.country ?? null}
      WHERE "userId" = ${userId}
    `
    await this.redis.delByPattern(`nearby:*`)
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, role: true, createdAt: true, followersCount: true, followingCount: true } },
        portfolioItems: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    return {
      ...profile,
      followersCount: profile.user.followersCount,
      followingCount: profile.user.followingCount,
    }
  }

  async getMyApplications(userId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    return this.prisma.jobApplication.findMany({
      where: { workerId: profile.id },
      include: {
        job: {
          include: {
            salon: { select: { name: true, photoUrls: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
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

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) throw new NotFoundException('Worker profile not found')
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } })
    if (!item || item.workerId !== profile.id) throw new NotFoundException('Portfolio item not found')
    await this.prisma.portfolioItem.delete({ where: { id: itemId } })
    return { deleted: true }
  }

  async toggleSaveWorker(userId: string, workerId: string): Promise<{ saved: boolean }> {
    const existing = await this.prisma.savedWorker.findUnique({
      where: { userId_workerId: { userId, workerId } },
    })
    if (existing) {
      await this.prisma.savedWorker.delete({ where: { id: existing.id } })
      return { saved: false }
    }
    await this.prisma.savedWorker.create({ data: { userId, workerId } })
    return { saved: true }
  }

  async getSavedWorkerIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedWorker.findMany({
      where: { userId },
      select: { workerId: true },
    })
    return rows.map((r) => r.workerId)
  }

  async getSavedWorkers(userId: string) {
    const rows = await this.prisma.savedWorker.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: {
          include: {
            user: { select: { followersCount: true } },
          },
        },
      },
    })
    return rows.map((r) => ({
      ...r.worker,
      followersCount: r.worker.user.followersCount,
    }))
  }

  private async assertExists(userId: string): Promise<void> {
    const exists = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!exists) throw new NotFoundException('Worker profile not found')
  }
}
