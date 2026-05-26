import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'
import { Availability } from '@prisma/client'

export class FindNearbyWorkersDto {
  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number

  @Transform(({ value }: { value: unknown }) => parseFloat(value as string))
  @IsNumber()
  @Min(0.5)
  @Max(100)
  radiusMiles!: number

  @IsString()
  cityId!: string

  @IsOptional()
  @IsString()
  specialty?: string

  @IsOptional()
  @IsEnum(Availability)
  availability?: Availability

  @IsOptional()
  @IsString()
  cursor?: string
}
