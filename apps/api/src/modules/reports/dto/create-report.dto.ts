import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator'
import type { ReportType } from '@prisma/client'

export class CreateReportDto {
  @IsUUID()
  reportedUserId!: string

  @IsIn(['FAKE_PROFILE', 'NO_SHOW', 'INAPPROPRIATE'])
  type!: ReportType

  @IsOptional()
  @IsString()
  reason?: string
}
