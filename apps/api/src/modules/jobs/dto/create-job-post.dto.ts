import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'
import { EmploymentType } from '@prisma/client'

export class CreateJobPostDto {
  @IsString()
  title!: string

  @IsString()
  description!: string

  @IsString()
  specialty!: string

  @IsString()
  payStructure!: string

  @IsEnum(EmploymentType)
  type!: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsString()
  cityId!: string

  @IsDateString()
  expiresAt!: string
}
