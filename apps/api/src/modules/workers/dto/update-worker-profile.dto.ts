import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import type { Availability, EmploymentType } from '@prisma/client'
import { ALL_SPECIALTY_IDS } from '@salonin/config'

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
  @IsIn(ALL_SPECIALTY_IDS, { each: true })
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

  @IsOptional()
  @IsObject()
  availabilitySchedule?: {
    days: string[]
    startTime: string
    endTime: string
  }

  @IsOptional()
  @IsIn(['HOURLY', 'PERCENTAGE', 'SEAT', 'CUSTOM'])
  workerPayType?: string

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

  // ── Booking settings ─────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  acceptsBookings?: boolean

  @IsOptional()
  @IsBoolean()
  homeServiceEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  travelServiceEnabled?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  travelRadius?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  travelFee?: number

  @IsOptional()
  @IsBoolean()
  availabilityEnabled?: boolean
}
