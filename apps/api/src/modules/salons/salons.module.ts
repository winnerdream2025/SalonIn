import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MatchingModule } from '../matching/matching.module'
import { SalonsController } from './salons.controller'
import { SalonsService } from './salons.service'

@Module({
  imports: [AuthModule, MatchingModule],
  controllers: [SalonsController],
  providers: [SalonsService],
})
export class SalonsModule {}
