import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator'
import { MediaType } from '@salonin/types'

export class AddPortfolioItemDto {
  @IsUrl()
  mediaUrl!: string

  @IsEnum(MediaType)
  type!: MediaType

  @IsOptional()
  @IsString()
  caption?: string
}
