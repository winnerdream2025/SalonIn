import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MessagingController } from './messaging.controller'
import { MessagingGateway } from './messaging.gateway'
import { MessagingService } from './messaging.service'
import { PresenceService } from './presence.service'

@Module({
  imports: [AuthModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, PresenceService],
  exports: [MessagingGateway],
})
export class MessagingModule {}
