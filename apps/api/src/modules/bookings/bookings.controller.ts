import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { BookingsService, type CreateBookingDto, type RescheduleDto } from './bookings.service'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'

type DateFilter = 'today' | 'tomorrow' | 'week' | 'month'

@Controller('bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingDto, @CurrentUser() user?: User) {
    return { data: await this.svc.create(dto, user?.id) }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@CurrentUser() user: User) {
    return { data: await this.svc.getMyBookings(user.email ?? '', user.id) }
  }

  @Get('provider')
  @UseGuards(JwtAuthGuard)
  async getProviderBookings(@CurrentUser() user: User, @Query('status') status?: string) {
    return { data: await this.svc.getProviderBookings(user, status) }
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirm(@CurrentUser() user: User, @Param('id') id: string) {
    return { data: await this.svc.confirm(user, id) }
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelByProvider(@CurrentUser() user: User, @Param('id') id: string, @Body('reason') reason?: string) {
    return { data: await this.svc.cancelByProvider(user, id, reason) }
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelByClient(@Body('bookingId') bookingId: string, @Body('cancelToken') cancelToken: string) {
    return { data: await this.svc.cancelByClient(cancelToken, bookingId) }
  }

  @Post('reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleByClient(
    @Body('bookingId') bookingId: string,
    @Body('cancelToken') cancelToken: string,
    @Body('rescheduleToken') rescheduleToken: string,
    @Body() dto: RescheduleDto,
  ) {
    const token = rescheduleToken ?? cancelToken
    return { data: await this.svc.rescheduleByClient(token, bookingId, dto) }
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async rescheduleByProvider(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('date') date: string,
    @Body('startTime') startTime: string,
    @Body('reason') reason?: string,
  ) {
    return { data: await this.svc.rescheduleByProvider(user, id, date, startTime, reason) }
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  async complete(@CurrentUser() user: User, @Param('id') id: string) {
    return { data: await this.svc.complete(user, id) }
  }

  @Patch(':id/no-show')
  @UseGuards(JwtAuthGuard)
  async noShow(@CurrentUser() user: User, @Param('id') id: string) {
    return { data: await this.svc.noShow(user, id) }
  }

  @Get('provider/filtered')
  @UseGuards(JwtAuthGuard)
  async getProviderBookingsFiltered(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('dateFilter') dateFilter?: DateFilter,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('serviceId') serviceId?: string,
    @Query('search') search?: string,
  ) {
    return { data: await this.svc.getProviderBookingsFiltered(user, { status, dateFilter, dateFrom, dateTo, serviceId, search }) }
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(@CurrentUser() user: User, @Query('period') period?: string) {
    const p = (['7d', '30d', '90d', '1y'] as const).find(v => v === period) ?? '30d'
    return { data: await this.svc.getAnalytics(user, p) }
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard)
  async getClients(@CurrentUser() user: User) {
    return { data: await this.svc.getClients(user) }
  }

  @Get('clients/:email')
  @UseGuards(JwtAuthGuard)
  async getClientHistory(
    @CurrentUser() user: User,
    @Param('email') clientEmail: string,
  ) {
    return { data: await this.svc.getClientHistory(user, decodeURIComponent(clientEmail)) }
  }
}
