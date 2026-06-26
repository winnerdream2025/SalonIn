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
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ClientsService } from './clients.service'
import { UpdateClientProfileDto } from './dto/update-client-profile.dto'

@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return { data: await this.svc.getMyProfile(user) }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@CurrentUser() user: User, @Body() dto: UpdateClientProfileDto) {
    return { data: await this.svc.updateMyProfile(user, dto) }
  }

  @Get('me/bookings')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@CurrentUser() user: User) {
    return { data: await this.svc.getMyBookings(user) }
  }

  @Get('me/saved-providers')
  @UseGuards(JwtAuthGuard)
  async getSavedProviders(@CurrentUser() user: User) {
    return { data: await this.svc.getSavedProviders(user) }
  }

  @Post('me/saved-providers/:workerId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveProvider(
    @CurrentUser() user: User,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    return { data: await this.svc.saveProvider(user, workerId) }
  }

  @Delete('me/saved-providers/:workerId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsaveProvider(
    @CurrentUser() user: User,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    await this.svc.unsaveProvider(user, workerId)
  }
}
