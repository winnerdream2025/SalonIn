import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { User } from '@salonin/types'
import type { CreateIntakeFormDto } from './dto/create-intake-form.dto'
import type { UpdateIntakeFormDto } from './dto/update-intake-form.dto'

@Injectable()
export class IntakeFormsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any
  }

  private async resolveProvider(user: User): Promise<{ providerId: string; providerType: string }> {
    if (user.role === 'SALON') {
      const salon = await this.prisma.salonProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
      if (!salon) throw new ForbiddenException('No salon profile found')
      return { providerId: salon.id, providerType: 'salon' }
    }
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!worker) throw new ForbiddenException('No worker profile found')
    return { providerId: worker.id, providerType: 'professional' }
  }

  async create(user: User, dto: CreateIntakeFormDto) {
    const { providerId, providerType } = await this.resolveProvider(user)
    return this.db.intakeForm.create({
      data: {
        providerId,
        providerType,
        title: dto.title,
        description: dto.description,
        questions: dto.questions,
        serviceIds: dto.serviceIds ?? [],
        isActive: dto.isActive ?? true,
      },
    })
  }

  async getMyForms(user: User) {
    const { providerId, providerType } = await this.resolveProvider(user)
    return this.db.intakeForm.findMany({
      where: { providerId, providerType },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getById(formId: string) {
    const form = await this.db.intakeForm.findUnique({ where: { id: formId } })
    if (!form) throw new NotFoundException('Intake form not found')
    return form
  }

  async getForProvider(providerId: string, providerType: string) {
    return this.db.intakeForm.findMany({
      where: { providerId, providerType, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        questions: true,
        serviceIds: true,
      },
    })
  }

  async update(user: User, formId: string, dto: UpdateIntakeFormDto) {
    const { providerId, providerType } = await this.resolveProvider(user)
    const form = await this.db.intakeForm.findUnique({ where: { id: formId } })
    if (!form) throw new NotFoundException('Intake form not found')
    if (form.providerId !== providerId || form.providerType !== providerType) {
      throw new ForbiddenException()
    }
    return this.db.intakeForm.update({
      where: { id: formId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.questions !== undefined && { questions: dto.questions }),
        ...(dto.serviceIds !== undefined && { serviceIds: dto.serviceIds }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      },
    })
  }

  async delete(user: User, formId: string) {
    const { providerId, providerType } = await this.resolveProvider(user)
    const form = await this.db.intakeForm.findUnique({ where: { id: formId } })
    if (!form) throw new NotFoundException('Intake form not found')
    if (form.providerId !== providerId || form.providerType !== providerType) {
      throw new ForbiddenException()
    }
    // Remove responses first to satisfy FK constraint
    await this.db.intakeResponse.deleteMany({ where: { formId } })
    await this.db.intakeForm.delete({ where: { id: formId } })
  }
}
