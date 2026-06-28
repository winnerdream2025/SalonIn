import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
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
    if (dto.city || dto.state || dto.country) {
      await this.prisma.salonProfile.update({
        where: { userId },
        data: {
          ...(dto.city ? { city: dto.city } : {}),
          ...(dto.state ? { state: dto.state } : {}),
          ...(dto.country ? { country: dto.country } : {}),
        },
      })
    }
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

  // ── SalonStaff ────────────────────────────────────────────────────────────

  async inviteWorker(salonUserId: string, workerId: string) {
    const salon = await this.prisma.salonProfile.findUnique({ where: { userId: salonUserId }, select: { id: true } })
    if (!salon) throw new NotFoundException('Salon profile not found')

    const worker = await this.prisma.workerProfile.findUnique({ where: { id: workerId }, select: { id: true } })
    if (!worker) throw new NotFoundException('Worker not found')

    const existing = await this.prisma.salonStaff.findUnique({
      where: { salonId_workerId: { salonId: salon.id, workerId } },
    })
    if (existing && existing.status !== 'REMOVED' && existing.status !== 'DECLINED') {
      throw new ConflictException('Worker is already invited or active')
    }

    if (existing) {
      return this.prisma.salonStaff.update({
        where: { id: existing.id },
        data: { status: 'INVITED', invitedAt: new Date(), respondedAt: null },
        include: { worker: { select: { id: true, name: true, photoUrl: true, specialties: true } } },
      })
    }

    return this.prisma.salonStaff.create({
      data: { salonId: salon.id, workerId },
      include: { worker: { select: { id: true, name: true, photoUrl: true, specialties: true } } },
    })
  }

  async getStaff(salonUserId: string) {
    const salon = await this.prisma.salonProfile.findUnique({ where: { userId: salonUserId }, select: { id: true } })
    if (!salon) throw new NotFoundException('Salon profile not found')
    return this.prisma.salonStaff.findMany({
      where: { salonId: salon.id, status: { not: 'REMOVED' } },
      include: { worker: { select: { id: true, name: true, photoUrl: true, specialties: true, city: true, state: true } } },
      orderBy: { invitedAt: 'desc' },
    })
  }

  async removeStaff(salonUserId: string, staffId: string) {
    const salon = await this.prisma.salonProfile.findUnique({ where: { userId: salonUserId }, select: { id: true } })
    if (!salon) throw new NotFoundException('Salon profile not found')
    const record = await this.prisma.salonStaff.findFirst({ where: { id: staffId, salonId: salon.id } })
    if (!record) throw new NotFoundException('Staff record not found')
    await this.prisma.salonStaff.update({ where: { id: staffId }, data: { status: 'REMOVED' } })
  }

  async getWorkerInvites(workerUserId: string) {
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: workerUserId }, select: { id: true } })
    if (!worker) throw new NotFoundException('Worker profile not found')
    return this.prisma.salonStaff.findMany({
      where: { workerId: worker.id, status: 'INVITED' },
      include: { salon: { select: { id: true, name: true, photoUrls: true, city: true, state: true } } },
      orderBy: { invitedAt: 'desc' },
    })
  }

  async respondToInvite(workerUserId: string, staffId: string, accept: boolean) {
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: workerUserId }, select: { id: true } })
    if (!worker) throw new NotFoundException('Worker profile not found')
    const record = await this.prisma.salonStaff.findFirst({ where: { id: staffId, workerId: worker.id } })
    if (!record) throw new NotFoundException('Invite not found')
    if (record.status !== 'INVITED') throw new ForbiddenException('Invite is no longer pending')
    return this.prisma.salonStaff.update({
      where: { id: staffId },
      data: { status: accept ? 'ACTIVE' : 'DECLINED', respondedAt: new Date() },
      include: { salon: { select: { id: true, name: true } } },
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
