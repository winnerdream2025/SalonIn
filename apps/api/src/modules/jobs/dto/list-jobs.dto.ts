import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'
import type { EmploymentType, ListingType } from '@prisma/client'

export class ListJobsDto {
  @IsString()
  cityId!: string

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
