import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import type { ReportType } from '@prisma/client'

export class CreateReportDto {
  @IsUUID()
  reportedUserId!: string

  @IsIn(['FAKE_PROFILE', 'NO_SHOW', 'INAPPROPRIATE'])
  type!: ReportType

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string
}
