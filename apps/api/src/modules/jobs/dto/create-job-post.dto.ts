import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import type { EmploymentType } from '@prisma/client'
import { IsSupportedCity } from '../../../common/validators/city-id.validator'
import { IsInFuture } from '../../../common/validators/is-future.validator'

export class CreateJobPostDto {
  @IsString()
  @MaxLength(100)
  title!: string

  @IsString()
  @MaxLength(3000)
  description!: string

  @IsString()
  @MaxLength(50)
  specialty!: string

  @IsString()
  @MaxLength(200)
  payStructure!: string

  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY'])
  type!: EmploymentType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsString()
  @IsSupportedCity()
  cityId!: string

  @IsDateString()
  @IsInFuture()
  expiresAt!: string
}
