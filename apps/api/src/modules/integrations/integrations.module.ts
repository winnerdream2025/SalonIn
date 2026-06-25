import { Module } from '@nestjs/common'
import { BookingProfilesModule } from '../booking-profiles/booking-profiles.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { HavanabookWebhookController } from './havanabook/havanabook-webhook.controller'
import { HavanabookWebhookService } from './havanabook/havanabook-webhook.service'

@Module({
  imports: [BookingProfilesModule, NotificationsModule],
  controllers: [HavanabookWebhookController],
  providers: [HavanabookWebhookService],
})
export class IntegrationsModule {}
