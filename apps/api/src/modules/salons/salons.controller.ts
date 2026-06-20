import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SalonsService } from './salons.service'
import { UpdateSalonProfileDto } from './dto/update-salon-profile.dto'
import { UpdateHiringStatusDto } from './dto/update-hiring-status.dto'
import { UpdateSalonLocationDto } from './dto/update-location.dto'

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.salonsService.getMe(user.id)
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
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
}
