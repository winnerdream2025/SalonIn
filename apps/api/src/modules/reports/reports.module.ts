import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { AuthModule } from '../auth/auth.module'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { ReportsProcessor } from './reports.processor'
import { REPORTS_QUEUE } from './reports.service'

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: REPORTS_QUEUE }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
})
export class ReportsModule {}
