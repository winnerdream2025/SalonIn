import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MessagingModule } from '../messaging/messaging.module'
import { StoriesController } from './stories.controller'
import { StoriesService } from './stories.service'

@Module({
  imports: [AuthModule, NotificationsModule, MessagingModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
