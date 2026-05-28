import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JobsService } from './jobs.service'
import { CreateJobPostDto } from './dto/create-job-post.dto'
import { UpdateJobPostDto } from './dto/update-job-post.dto'
import { ListJobsDto } from './dto/list-jobs.dto'
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateJobPostDto) {
    return this.jobsService.create(user.id, dto)
  }

  @Get()
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  list(@Query() dto: ListJobsDto) {
    return this.jobsService.list(dto)
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.jobsService.getById(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateJobPostDto,
  ) {
    return this.jobsService.update(id, user.id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    await this.jobsService.remove(id, user.id)
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WORKER')
  @HttpCode(HttpStatus.CREATED)
  applyToJob(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.applyToJob(id, user.id)
  }

  @Get(':id/applicants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  getApplicants(@Param('id') id: string, @CurrentUser() user: User) {
    return this.jobsService.getApplicants(id, user.id)
  }

  @Patch(':id/applicants/:applicationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  updateApplicationStatus(
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobsService.updateApplicationStatus(id, applicationId, user.id, dto)
  }
}
