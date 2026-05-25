import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { PrismaService } from '../../prisma/prisma.service'
import { REPORTS_QUEUE } from './reports.service'

const SUSPENSION_THRESHOLD = 3

@Processor(REPORTS_QUEUE)
export class ReportsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async process(job: Job<{ reportedId: string }>): Promise<void> {
    const { reportedId } = job.data

    const count = await this.prisma.report.count({
      where: { reportedId, status: 'PENDING' },
    })

    if (count >= SUSPENSION_THRESHOLD) {
      await this.prisma.user.update({
        where: { id: reportedId },
        data: { isActive: false },
      })
    }
  }
}
