import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { ProviderAvailabilityModule } from '../provider-availability/provider-availability.module'
import { EmailModule } from '../email/email.module'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'
import { BookingReminderService } from './booking-reminder.service'

@Module({
  imports: [AuthModule, NotificationsModule, ProviderAvailabilityModule, EmailModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingReminderService],
  exports: [BookingsService],
})
export class BookingsModule {}
