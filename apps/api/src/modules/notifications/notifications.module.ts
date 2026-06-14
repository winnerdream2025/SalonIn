import { Global, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsService } from './notifications.service'
import { DevicesController } from './devices.controller'
import { NotificationsController } from './notifications.controller'

@Global()
@Module({
  imports: [AuthModule],
  controllers: [DevicesController, NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
