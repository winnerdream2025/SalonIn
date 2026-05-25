import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { ReportsService } from './reports.service'
import { CreateReportDto } from './dto/create-report.dto'

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createReport(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    await this.reportsService.createReport(user.id, dto)
    return { success: true }
  }
}
