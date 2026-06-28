import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import type { UpdateSalonProfileDto } from './dto/update-salon-profile.dto'
import type { UpdateHiringStatusDto } from './dto/update-hiring-status.dto'
import type { UpdateSalonLocationDto } from './dto/update-location.dto'

@Injectable()
export class SalonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async updateLocation(userId: string, dto: UpdateSalonLocationDto): Promise<void> {
    await this.assertExists(userId)
    await this.prisma.$executeRaw`
      UPDATE "SalonProfile"
      SET location = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
      WHERE "userId" = ${userId}
    `
    await this.redis.delByPattern('nearby-salons:*')
  }

  async getMe(userId: string) {
    const profile = await this.prisma.salonProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, role: true, createdAt: true, followersCount: true, followingCount: true } },
        jobPosts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!profile) throw new NotFoundException('Salon profile not found')
    return {
      ...profile,
      followersCount: profile.user.followersCount,
      followingCount: profile.user.followingCount,
    }
  }

  async getProfile(id: string) {
    const profile = await this.prisma.salonProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, role: true, createdAt: true, followersCount: true, followingCount: true } },
        jobPosts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!profile) throw new NotFoundException('Salon not found')
    return {
      ...profile,
      followersCount: profile.user.followersCount,
      followingCount: profile.user.followingCount,
    }
  }

  async updateProfile(userId: string, dto: UpdateSalonProfileDto) {
    await this.assertExists(userId)
    return this.prisma.salonProfile.update({
      where: { userId },
      data: { ...dto },
    })
  }

  async updateHiringStatus(userId: string, dto: UpdateHiringStatusDto) {
    await this.assertExists(userId)
    return this.prisma.salonProfile.update({
      where: { userId },
      data: { isHiring: dto.isHiring },
    })
  }

  private async assertExists(userId: string): Promise<void> {
    const exists = await this.prisma.salonProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!exists) throw new NotFoundException('Salon profile not found')
  }
}
