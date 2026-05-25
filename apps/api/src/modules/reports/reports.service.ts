import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateReportDto } from './dto/create-report.dto'

export const REPORTS_QUEUE = 'reports'

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(REPORTS_QUEUE) private readonly reportQueue: Queue,
  ) {}

  async createReport(reporterId: string, dto: CreateReportDto): Promise<void> {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('Cannot report yourself')
    }

    const reported = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: dto.reportedUserId },
          { workerProfile: { id: dto.reportedUserId } },
          { salonProfile: { id: dto.reportedUserId } },
        ],
      },
      select: { id: true },
    })
    if (!reported) throw new NotFoundException('User not found')

    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        reportedId: reported.id,
        type: dto.type,
        status: 'PENDING',
      },
    })
    if (existing) throw new BadRequestException('You have already submitted this report')

    await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: reported.id,
        type: dto.type,
        reason: dto.reason,
      },
    })

    await this.reportQueue.add('check-suspension', { reportedId: reported.id })
  }
}
