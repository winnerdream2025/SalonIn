import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { ProviderAvailabilityService, type DayRule, type AvailabilityExceptionDto } from './provider-availability.service'

@Controller('availability')
export class ProviderAvailabilityController {
  constructor(private readonly svc: ProviderAvailabilityService) {}

  @Get('hours')
  async getHours(
    @Query('providerId') providerId: string,
    @Query('providerType') providerType: string,
  ) {
    return { data: await this.svc.getRules(providerId, providerType) }
  }

  @Put('hours')
  @UseGuards(JwtAuthGuard)
  async setHours(@CurrentUser() user: User, @Body('rules') rules: DayRule[]) {
    return { data: await this.svc.setRules(user, rules) }
  }

  @Get('slots')
  async getSlots(
    @Query('providerId') providerId: string,
    @Query('providerType') providerType: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    return { data: await this.svc.getSlots(providerId, providerType, date, duration ? parseInt(duration, 10) : undefined) }
  }

  @Get('calendar')
  async getCalendar(
    @Query('providerId') providerId: string,
    @Query('providerType') providerType: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return { data: await this.svc.getCalendar(providerId, providerType, parseInt(year, 10), parseInt(month, 10)) }
  }

  @Get('exceptions')
  async getExceptions(
    @Query('providerId') providerId: string,
    @Query('providerType') providerType: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return { data: await this.svc.getExceptions(providerId, providerType, from, to) }
  }

  @Post('exceptions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addException(@CurrentUser() user: User, @Body() dto: AvailabilityExceptionDto) {
    return { data: await this.svc.addException(user, dto) }
  }

  @Delete('exceptions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteException(@CurrentUser() user: User, @Param('id') id: string) {
    await this.svc.deleteException(user, id)
  }
}
