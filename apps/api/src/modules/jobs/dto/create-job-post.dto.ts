import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'
import type { EmploymentType, ListingType } from '@prisma/client'
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

  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY', 'CONTRACT', 'SEASONAL', 'APPRENTICESHIP', 'FREELANCE'])
  type!: EmploymentType

  @IsOptional()
  @IsIn(['JOB', 'RENTAL', 'SPACE'])
  listingType?: ListingType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsString()
  @IsSupportedCity()
  cityId!: string

  @IsDateString()
  @IsInFuture()
  expiresAt!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spacePhotos?: string[]

  @IsOptional()
  @IsString()
  spaceSize?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spaceAmenities?: string[]

  @IsOptional()
  @IsNumber()
  rentalDeposit?: number

  @IsOptional()
  @IsDateString()
  availableFrom?: string
}
