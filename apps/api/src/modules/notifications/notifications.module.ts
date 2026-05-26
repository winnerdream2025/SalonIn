import { Global, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsService } from './notifications.service'
import { DevicesController } from './devices.controller'

@Global()
@Module({
  imports: [AuthModule],
  controllers: [DevicesController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
