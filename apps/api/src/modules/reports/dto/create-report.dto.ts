import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator'
import { ReportType } from '@prisma/client'

export class CreateReportDto {
  @IsUUID()
  reportedUserId!: string

  @IsIn(Object.values(ReportType))
  type!: ReportType

  @IsOptional()
  @IsString()
  reason?: string
}
