import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator'
import type { EmploymentType } from '@prisma/client'

export class UpdateJobPostDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  specialty?: string

  @IsOptional()
  @IsString()
  payStructure?: string

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY'])
  type?: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
