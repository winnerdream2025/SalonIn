import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator'
import { ALL_SPECIALTY_IDS } from '@salonin/config'

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
  @IsString()
  @MaxLength(300)
  bio?: string

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

  @IsOptional()
  @IsString()
  placeId?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  formattedAddress?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(ALL_SPECIALTY_IDS, { each: true })
  preferredSpecialties?: string[]
}
