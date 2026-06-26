import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminService } from './admin.service'
import { ListUsersDto, ListReportsDto, ResolveReportDto, AnalyticsPeriodDto } from './dto/admin.dto'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Throttle({ short: { limit: 120, ttl: 60000 } })
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  async listUsers(@Query() dto: ListUsersDto) {
    return { data: await this.svc.listUsers(dto) }
  }

  @Get('users/:id')
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.svc.getUser(id) }
  }

  @Patch('users/:id/suspend')
  async suspendUser(@CurrentUser() admin: User, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.svc.suspendUser(admin.id, id) }
  }

  @Patch('users/:id/activate')
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.svc.activateUser(id) }
  }

  @Patch('users/:id/verify')
  async verifyUser(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.svc.verifyUser(id) }
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@CurrentUser() admin: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.deleteUser(admin.id, id)
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports')
  async listReports(@Query() dto: ListReportsDto) {
    return { data: await this.svc.listReports(dto) }
  }

  @Patch('reports/:id')
  async resolveReport(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return { data: await this.svc.resolveReport(admin.id, id, dto) }
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics(@Query() dto: AnalyticsPeriodDto) {
    return { data: await this.svc.getAnalytics(dto) }
  }
}
