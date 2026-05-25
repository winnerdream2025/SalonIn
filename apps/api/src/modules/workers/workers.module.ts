import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MatchingModule } from '../matching/matching.module'
import { WorkersController } from './workers.controller'
import { WorkersService } from './workers.service'

@Module({
  imports: [AuthModule, MatchingModule],
  controllers: [WorkersController],
  providers: [WorkersService],
})
export class WorkersModule {}
