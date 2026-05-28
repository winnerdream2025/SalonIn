import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'
import type { Role } from '@prisma/client'
import { IsSupportedCity } from '../../../common/validators/city-id.validator'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsIn(['WORKER', 'SALON'])
  role!: Role

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  @IsSupportedCity()
  cityId!: string

  @IsOptional()
  @IsString()
  phone?: string | undefined
}
