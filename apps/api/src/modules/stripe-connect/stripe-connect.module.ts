import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeConnectService } from './stripe-connect.service'

@Module({
  imports: [AuthModule],
  controllers: [StripeConnectController],
  providers: [StripeConnectService],
  exports: [StripeConnectService],
})
export class StripeConnectModule {}
