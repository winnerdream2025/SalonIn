import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { UpdateSalonProfileDto } from './dto/update-salon-profile.dto'
import type { UpdateHiringStatusDto } from './dto/update-hiring-status.dto'

@Injectable()
export class SalonsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const profile = await this.prisma.salonProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, role: true, createdAt: true } },
        jobPosts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!profile) throw new NotFoundException('Salon profile not found')
    return profile
  }

  async getProfile(id: string) {
    const profile = await this.prisma.salonProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, role: true, createdAt: true } },
        jobPosts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!profile) throw new NotFoundException('Salon not found')
    return profile
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
