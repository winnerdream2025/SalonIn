import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { NotificationsService } from './notifications.service'
import { RegisterDeviceDto } from './dto/register-device.dto'

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerDevice(@CurrentUser() user: User, @Body() dto: RegisterDeviceDto): Promise<void> {
    await this.notificationsService.upsertDevice(user.id, dto.expoPushToken, dto.platform)
  }
}
