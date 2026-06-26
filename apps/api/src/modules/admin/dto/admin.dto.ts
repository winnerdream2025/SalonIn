import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export class ListUsersDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(['WORKER', 'SALON', 'ADMIN'])
  role?: string

  @IsOptional()
  @IsIn(['CLIENT', 'PROFESSIONAL', 'SALON'])
  accountType?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true')
  isActive?: boolean

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}

export class ListReportsDto {
  @IsOptional()
  @IsIn(['PENDING', 'REVIEWED', 'DISMISSED'])
  status?: string

  @IsOptional()
  @IsIn(['FAKE_PROFILE', 'NO_SHOW', 'INAPPROPRIATE'])
  type?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}

export class ResolveReportDto {
  @IsEnum({ REVIEWED: 'REVIEWED', DISMISSED: 'DISMISSED' })
  status!: 'REVIEWED' | 'DISMISSED'

  @IsOptional()
  @IsString()
  adminNote?: string
}

export class AnalyticsPeriodDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  period?: '7d' | '30d' | '90d' | '1y'
}
