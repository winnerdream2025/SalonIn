import { Module } from '@nestjs/common'
import { FollowsService } from './follows.service'
import { FollowsController } from './follows.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
