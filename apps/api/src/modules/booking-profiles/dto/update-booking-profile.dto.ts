import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'


export class UpdateBookingProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenantSlug?: string

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
