import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator'
import type { EmploymentType, ListingType } from '@prisma/client'

export class UpdateJobPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  specialty?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payStructure?: string

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY', 'CONTRACT', 'SEASONAL', 'APPRENTICESHIP', 'FREELANCE'])
  type?: EmploymentType

  @IsOptional()
  @IsIn(['JOB', 'RENTAL', 'SPACE'])
  listingType?: ListingType

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  spacePhotos?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spaceSize?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  spaceAmenities?: string[]

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  rentalDeposit?: number

  @IsOptional()
  @IsDateString()
  availableFrom?: string

  @IsOptional()
  @IsIn(['HOURLY', 'PERCENTAGE', 'SEAT', 'CUSTOM'])
  jobPayType?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  payMin?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  payMax?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  payPercentage?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  seatRate?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payNote?: string
}
