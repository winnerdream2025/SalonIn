import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SalonsService } from './salons.service'
import { UpdateSalonProfileDto } from './dto/update-salon-profile.dto'
import { UpdateHiringStatusDto } from './dto/update-hiring-status.dto'

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
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateSalonProfileDto) {
    return this.salonsService.updateProfile(user.id, dto)
  }

  @Patch('hiring-status')
  @UseGuards(JwtAuthGuard)
  updateHiringStatus(@CurrentUser() user: User, @Body() dto: UpdateHiringStatusDto) {
    return this.salonsService.updateHiringStatus(user.id, dto)
  }
}
