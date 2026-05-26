import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator'
import type { EmploymentType } from '@prisma/client'

export class CreateJobPostDto {
  @IsString()
  title!: string

  @IsString()
  description!: string

  @IsString()
  specialty!: string

  @IsString()
  payStructure!: string

  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY'])
  type!: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsString()
  cityId!: string

  @IsDateString()
  expiresAt!: string
}
