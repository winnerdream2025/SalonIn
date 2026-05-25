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
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JobsService } from './jobs.service'
import { CreateJobPostDto } from './dto/create-job-post.dto'
import { UpdateJobPostDto } from './dto/update-job-post.dto'
import { ListJobsDto } from './dto/list-jobs.dto'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateJobPostDto) {
    return this.jobsService.create(user.id, dto)
  }

  @Get()
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
}
