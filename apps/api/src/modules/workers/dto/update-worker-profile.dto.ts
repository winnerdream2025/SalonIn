import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import type { Availability, EmploymentType } from '@prisma/client'

export class UpdateWorkerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsUrl()
  photoUrl?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  specialties?: string[]

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  radiusMiles?: number

  @IsOptional()
  @IsIn(['NOW', 'TODAY', 'WEEKEND', 'NOT_AVAILABLE'])
  availability?: Availability

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  languages?: string[]

  @IsOptional()
  @IsString()
  expectedPay?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rateRange?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rateNote?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY', 'CONTRACT', 'SEASONAL', 'APPRENTICESHIP', 'FREELANCE'], { each: true })
  employmentTypes?: EmploymentType[]

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string
}
