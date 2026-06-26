import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export type SearchType = 'workers' | 'salons' | 'services' | 'jobs' | 'all'

export class SearchDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(['workers', 'salons', 'services', 'jobs', 'all'])
  type?: SearchType

  @IsOptional()
  @IsString()
  specialty?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsEnum([1, 2, 3, 4, 5])
  rating?: number

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number
}
