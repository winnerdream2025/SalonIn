import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: User, @Query('page') page?: string) {
    return this.service.list(user.id, page ? parseInt(page, 10) : 1)
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.service.unreadCount(user.id) }
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: User): Promise<void> {
    await this.service.markAllRead(user.id)
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.service.markRead(user.id, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.service.deleteNotification(user.id, id)
  }
}
