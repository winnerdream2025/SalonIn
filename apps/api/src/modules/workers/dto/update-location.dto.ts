import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateLocationDto {
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
  @MaxLength(120)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string
}
