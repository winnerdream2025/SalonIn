import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'
import { EmploymentType } from '@prisma/client'

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
  @IsEnum(EmploymentType)
  type?: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
