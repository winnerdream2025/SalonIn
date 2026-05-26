import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator'
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

  @IsIn(Object.values(EmploymentType))
  type!: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsString()
  cityId!: string

  @IsDateString()
  expiresAt!: string
}
