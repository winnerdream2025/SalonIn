import { IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsUrl()
  photoUrl?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSpecialties?: string[]
}
