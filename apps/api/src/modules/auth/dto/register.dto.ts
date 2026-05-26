import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'
import { Role } from '@prisma/client'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsIn(Object.values(Role))
  role!: Role

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  cityId!: string

  @IsOptional()
  @IsString()
  phone?: string | undefined
}
