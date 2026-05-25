import { IsOptional, IsString } from 'class-validator'

export class SendMessageDto {
  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  mediaUrl?: string
}
