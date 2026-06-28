import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateSalonLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string
}
