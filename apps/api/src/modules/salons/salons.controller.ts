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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SalonsService } from './salons.service'
import { MatchingService } from '../matching/matching.service'
import { FindNearbyWorkersDto } from '../matching/dto/find-nearby-workers.dto'
import { UpdateSalonProfileDto } from './dto/update-salon-profile.dto'
import { UpdateHiringStatusDto } from './dto/update-hiring-status.dto'
import { UpdateSalonLocationDto } from './dto/update-location.dto'

@Controller('salons')
export class SalonsController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly matchingService: MatchingService,
  ) {}

  @Get('nearby')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  findNearby(@Query() dto: FindNearbyWorkersDto) {
    return this.matchingService.findNearbySalons(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.salonsService.getMe(user.id)
  }

  @Get(':id')
  getProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsService.getProfile(id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateSalonProfileDto) {
    return this.salonsService.updateProfile(user.id, dto)
  }

  @Patch('hiring-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  updateHiringStatus(@CurrentUser() user: User, @Body() dto: UpdateHiringStatusDto) {
    return this.salonsService.updateHiringStatus(user.id, dto)
  }

  @Post('location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateSalonLocationDto,
  ): Promise<void> {
    await this.salonsService.updateLocation(user.id, dto)
  }

  // ── SalonStaff — Salon-side ────────────────────────────────────────────────

  @Post('staff/invite/:workerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  inviteWorker(
    @CurrentUser() user: User,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    return this.salonsService.inviteWorker(user.id, workerId)
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  getStaff(@CurrentUser() user: User) {
    return this.salonsService.getStaff(user.id)
  }

  @Delete('staff/:staffId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStaff(
    @CurrentUser() user: User,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<void> {
    await this.salonsService.removeStaff(user.id, staffId)
  }

  // ── SalonStaff — Worker-side ───────────────────────────────────────────────

  @Get('staff/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WORKER')
  getMyInvites(@CurrentUser() user: User) {
    return this.salonsService.getWorkerInvites(user.id)
  }

  @Patch('staff/invites/:staffId/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WORKER')
  acceptInvite(
    @CurrentUser() user: User,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.salonsService.respondToInvite(user.id, staffId, true)
  }

  @Patch('staff/invites/:staffId/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WORKER')
  declineInvite(
    @CurrentUser() user: User,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.salonsService.respondToInvite(user.id, staffId, false)
  }
}
