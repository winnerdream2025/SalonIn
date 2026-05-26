import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { ReportType } from '@prisma/client'

export class CreateReportDto {
  @IsUUID()
  reportedUserId!: string

  @IsEnum(ReportType)
  type!: ReportType

  @IsOptional()
  @IsString()
  reason?: string
}
