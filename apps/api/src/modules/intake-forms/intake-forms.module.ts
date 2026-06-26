import { Module } from '@nestjs/common'
import { IntakeFormsController } from './intake-forms.controller'
import { IntakeFormsService } from './intake-forms.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IntakeFormsController],
  providers: [IntakeFormsService],
  exports: [IntakeFormsService],
})
export class IntakeFormsModule {}
