import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'
import { EmploymentType } from '@prisma/client'

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
  @IsIn(Object.values(EmploymentType))
  type?: EmploymentType

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
  @Max(50)
  limit?: number
}
