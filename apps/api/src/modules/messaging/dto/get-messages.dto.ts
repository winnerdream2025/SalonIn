import { IsOptional, IsString } from 'class-validator'

export class GetMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string
}
