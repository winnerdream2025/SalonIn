import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { UpdateClientProfileDto } from './dto/update-client-profile.dto'

@Injectable()
export class ClientProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<object> {
    let profile = await this.prisma.clientProfile.findUnique({ where: { userId } })
    if (!profile) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      const fallbackName = user?.email?.split('@')[0] ?? 'Client'
      profile = await this.prisma.clientProfile.create({
        data: { userId, name: fallbackName },
      })
    }
    return profile
  }

  async update(userId: string, dto: UpdateClientProfileDto): Promise<object> {
    const existing = await this.prisma.clientProfile.findUnique({ where: { userId } })
    if (!existing) throw new NotFoundException('Client profile not found')
    return this.prisma.clientProfile.update({
      where: { userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
        ...(dto.preferredSpecialties !== undefined ? { preferredSpecialties: dto.preferredSpecialties } : {}),
      },
    })
  }
}
