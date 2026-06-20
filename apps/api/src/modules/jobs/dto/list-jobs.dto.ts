import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'
import type { EmploymentType, ListingType } from '@prisma/client'

export class ListJobsDto {
  @Transform(({ value }: { value: unknown }) => value !== undefined ? parseFloat(value as string) : undefined)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number

  @Transform(({ value }: { value: unknown }) => value !== undefined ? parseFloat(value as string) : undefined)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number

  @Transform(({ value }: { value: unknown }) => value !== undefined ? parseFloat(value as string) : undefined)
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(200)
  radiusMiles?: number

  /** @deprecated Use lat/lng instead. Kept for backward compatibility. */
  @IsOptional()
  @IsString()
  cityId?: string

  @IsOptional()
  @IsString()
  salonId?: string

  @IsOptional()
  @IsString()
  specialty?: string

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'WEEKEND', 'EMERGENCY', 'CONTRACT', 'SEASONAL', 'APPRENTICESHIP', 'FREELANCE'])
  type?: EmploymentType

  @IsOptional()
  @IsIn(['JOB', 'RENTAL', 'SPACE'])
  listingType?: ListingType

  @Transform(({ value }: { value: unknown }) =>
    value !== undefined ? parseInt(value as string, 10) : 1,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @Transform(({ value }: { value: unknown }) =>
    value !== undefined ? parseInt(value as string, 10) : 20,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
