import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { User } from '@salonin/types'
import type { UpdateClientProfileDto } from './dto/update-client-profile.dto'

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.prisma as any }

  private async assertClient(user: User) {
    if (user.accountType !== 'CLIENT') {
      throw new ForbiddenException('This endpoint is for client accounts only')
    }
  }

  async getMyProfile(user: User) {
    await this.assertClient(user)
    const profile = await this.db.clientProfile.findUnique({
      where: { userId: user.id },
    })
    if (!profile) throw new NotFoundException('Client profile not found')
    return profile
  }

  async updateMyProfile(user: User, dto: UpdateClientProfileDto) {
    await this.assertClient(user)
    const profile = await this.db.clientProfile.findUnique({
      where: { userId: user.id },
    })
    if (!profile) throw new NotFoundException('Client profile not found')
    return this.db.clientProfile.update({
      where: { userId: user.id },
      data: { ...dto, updatedAt: new Date() },
    })
  }

  async getMyBookings(user: User) {
    return this.db.booking.findMany({
      where: {
        OR: [
          { clientUserId: user.id },
          { clientEmail: user.email },
        ],
      },
      include: {
        service: {
          select: { name: true, category: true, duration: true, price: true },
        },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    })
  }

  async getSavedProviders(user: User) {
    const saved = await this.db.savedWorker.findMany({
      where: { userId: user.id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            specialties: true,
            city: true,
            state: true,
            rating: true,
            reviewCount: true,
            acceptsBookings: true,
            availability: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return saved.map((s: { createdAt: Date; worker: object }) => ({
      savedAt: s.createdAt,
      ...s.worker,
    }))
  }

  async saveProvider(user: User, workerId: string) {
    const worker = await this.db.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true },
    })
    if (!worker) throw new NotFoundException('Provider not found')

    return this.db.savedWorker.upsert({
      where: { userId_workerId: { userId: user.id, workerId } },
      create: { userId: user.id, workerId },
      update: {},
    })
  }

  async unsaveProvider(user: User, workerId: string) {
    const existing = await this.db.savedWorker.findUnique({
      where: { userId_workerId: { userId: user.id, workerId } },
    })
    if (!existing) throw new NotFoundException('Provider not saved')
    await this.db.savedWorker.delete({
      where: { userId_workerId: { userId: user.id, workerId } },
    })
  }
}
