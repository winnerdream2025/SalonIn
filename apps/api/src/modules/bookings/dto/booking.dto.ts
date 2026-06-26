import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string

  @IsString()
  @IsIn(['professional', 'salon'])
  providerType!: string

  @IsString()
  @IsNotEmpty()
  serviceId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientName!: string

  @IsEmail()
  @MaxLength(100)
  clientEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clientPhone?: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @IsString()
  intakeFormId?: string

  @IsOptional()
  @IsArray()
  intakeAnswers?: { questionId: string; answer: unknown }[]
}

export class WaitlistDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string

  @IsString()
  @IsIn(['professional', 'salon'])
  providerType!: string

  @IsString()
  @IsNotEmpty()
  serviceId!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientName!: string

  @IsEmail()
  @MaxLength(100)
  clientEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clientPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

export class RebookDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}

export class RescheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string
}

export class ProviderRescheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class ClientRescheduleDto extends RescheduleDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string

  @IsOptional()
  @IsString()
  cancelToken?: string

  @IsOptional()
  @IsString()
  rescheduleToken?: string
}

export class ClientCancelDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  cancelToken!: string
}
