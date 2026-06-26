import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { User } from '@salonin/types'

export interface ServiceDto {
  name: string
  description?: string
  duration: number
  price: number
  currency?: string
  category?: string
  isActive?: boolean
  sortOrder?: number
}

@Injectable()
export class ProviderServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.prisma as any }

  private async resolveProviderId(user: User): Promise<{ providerId: string; providerType: string }> {
    if (user.role === 'SALON') {
      const salon = await this.prisma.salonProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      if (!salon) throw new ForbiddenException('No salon profile found')
      return { providerId: salon.id, providerType: 'salon' }
    }
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
    if (!worker) throw new ForbiddenException('No worker profile found')
    return { providerId: worker.id, providerType: 'professional' }
  }

  async list(providerId: string, providerType: string) {
    return this.db.providerService.findMany({
      where: { providerId, providerType, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async create(user: User, dto: ServiceDto) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    return this.db.providerService.create({
      data: {
        providerId,
        providerType,
        name: dto.name,
        description: dto.description ?? null,
        duration: dto.duration,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        category: dto.category ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
  }

  async update(user: User, id: string, dto: Partial<ServiceDto>) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const existing = await this.db.providerService.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Service not found')
    if (existing.providerId !== providerId || existing.providerType !== providerType) {
      throw new ForbiddenException('Not your service')
    }
    return this.db.providerService.update({ where: { id }, data: { ...dto, updatedAt: new Date() } })
  }

  async remove(user: User, id: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const existing = await this.db.providerService.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Service not found')
    if (existing.providerId !== providerId || existing.providerType !== providerType) {
      throw new ForbiddenException('Not your service')
    }
    await this.db.providerService.update({ where: { id }, data: { isActive: false } })
  }
}
