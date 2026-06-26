import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator'

export class UpdateSalonProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  photoUrls?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  specialties?: string[]

  @IsOptional()
  @IsBoolean()
  isHiring?: boolean

  // ── Booking settings ─────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  acceptsBookings?: boolean

  @IsOptional()
  @IsBoolean()
  instantBooking?: boolean

  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  cancellationWindowHours?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  rescheduleWindowHours?: number

  @IsOptional()
  @IsBoolean()
  lateFeeEnabled?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  lateFeeAmount?: number
}
