import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import type { Role } from '@prisma/client'
import { IsSupportedCity } from '../../../common/validators/city-id.validator'

export class RegisterDto {
  @IsEmail()
  @MaxLength(100)
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsIn(['WORKER', 'SALON'])
  role!: Role

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsString()
  @IsNotEmpty()
  @IsSupportedCity()
  cityId!: string

  @IsOptional()
  @IsString()
  phone?: string | undefined
}
