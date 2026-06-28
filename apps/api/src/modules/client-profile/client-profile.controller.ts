import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { ClientProfileService } from './client-profile.service'
import { UpdateClientProfileDto } from './dto/update-client-profile.dto'

@Controller('client-profile')
@UseGuards(JwtAuthGuard)
export class ClientProfileController {
  constructor(private readonly svc: ClientProfileService) {}

  @Get()
  async getMe(@CurrentUser() user: User) {
    return { data: await this.svc.getOrCreate(user.id) }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async update(@CurrentUser() user: User, @Body() dto: UpdateClientProfileDto) {
    return { data: await this.svc.update(user.id, dto) }
  }
}
