import {
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
import { EmploymentType } from '@prisma/client'

export class UpdateWorkerProfileDto {
  @IsOptional()
  @IsString()
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
  @IsString({ each: true })
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
  @IsArray()
  @IsString({ each: true })
  languages?: string[]

  @IsOptional()
  @IsString()
  expectedPay?: string

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(EmploymentType), { each: true })
  employmentTypes?: EmploymentType[]

  @IsOptional()
  @IsString()
  licenseNumber?: string
}
