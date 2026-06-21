import { IsOptional, IsString } from 'class-validator'

export class SearchConversationsDto {
  @IsOptional()
  @IsString()
  search?: string
}
