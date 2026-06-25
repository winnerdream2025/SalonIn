import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class AutoSetupBookingDto {
  @IsString()
  @MaxLength(100)
  providerId!: string

  @IsEnum(['professional', 'salon'])
  providerType!: 'professional' | 'salon'

  @IsString()
  @MaxLength(200)
  businessName!: string

  @IsString()
  @MaxLength(200)
  email!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}
