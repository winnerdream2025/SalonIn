import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator'

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string

  @IsOptional()
  @IsUrl()
  mediaUrl?: string

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
  @IsIn(['TEXT', 'MEDIA', 'VOICE', 'SYSTEM'])
  type?: string

  @IsOptional()
  @IsUUID()
  replyToId?: string
}
