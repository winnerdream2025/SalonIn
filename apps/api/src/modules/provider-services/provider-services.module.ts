import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProviderServicesController } from './provider-services.controller'
import { ProviderServicesService } from './provider-services.service'

@Module({
  imports: [AuthModule],
  controllers: [ProviderServicesController],
  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
