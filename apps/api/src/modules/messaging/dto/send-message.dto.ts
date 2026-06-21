import { IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator'

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string

  @IsOptional()
  @IsUrl()
  mediaUrl?: string

  @IsOptional()
  @IsUUID()
  replyToId?: string
}
