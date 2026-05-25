import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateSalonProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[]
}
