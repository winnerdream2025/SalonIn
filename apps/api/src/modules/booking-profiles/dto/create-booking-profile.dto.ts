import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import type { BookingProviderType } from '@salonin/types'

export class CreateBookingProfileDto {
  @IsUUID()
  providerId!: string

  @IsIn(['professional', 'salon'])
  providerType!: BookingProviderType

  @IsString()
  @MaxLength(100)
  tenantSlug!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalBookingSystemId?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerEmail?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerPassword?: string
}
