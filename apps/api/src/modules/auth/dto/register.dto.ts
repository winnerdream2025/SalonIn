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

  @IsOptional()
  @IsString()
  phone?: string | undefined

  @IsOptional()
  @IsIn(['CLIENT', 'PROFESSIONAL', 'SALON'])
  accountType?: 'CLIENT' | 'PROFESSIONAL' | 'SALON'
}
