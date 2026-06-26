import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProviderAvailabilityController } from './provider-availability.controller'
import { ProviderAvailabilityService } from './provider-availability.service'

@Module({
  imports: [AuthModule],
  controllers: [ProviderAvailabilityController],
  providers: [ProviderAvailabilityService],
  exports: [ProviderAvailabilityService],
})
export class ProviderAvailabilityModule {}
