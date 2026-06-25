import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BookingProfilesController } from './booking-profiles.controller'
import { BookingProfilesService } from './booking-profiles.service'

@Module({
  imports: [AuthModule],
  controllers: [BookingProfilesController],
  providers: [BookingProfilesService],
  exports: [BookingProfilesService],
})
export class BookingProfilesModule {}
