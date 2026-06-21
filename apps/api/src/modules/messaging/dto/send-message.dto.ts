import {
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'

const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'CONTACT', 'LOCATION', 'VOICE', 'MEDIA', 'SYSTEM']

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string

  @IsOptional()
  @IsUrl()
  mediaUrl?: string

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[]

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string

  @IsOptional()
  @IsUrl()
  audioUrl?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number

  @IsOptional()
  @IsArray()
  waveformData?: number[]

  @IsOptional()
  @IsString()
  @MaxLength(260)
  fileName?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  locationName?: string

  @IsOptional()
  @IsIn(MESSAGE_TYPES)
  type?: string

  @IsOptional()
  @IsUUID()
  replyToId?: string
}
