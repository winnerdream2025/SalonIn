import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { ClientProfileController } from './client-profile.controller'
import { ClientProfileService } from './client-profile.service'

@Module({
  imports: [PrismaModule],
  controllers: [ClientProfileController],
  providers: [ClientProfileService],
  exports: [ClientProfileService],
})
export class ClientProfileModule {}
