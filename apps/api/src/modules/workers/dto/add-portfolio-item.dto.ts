import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator'
import { MediaType } from '@prisma/client'

export class AddPortfolioItemDto {
  @IsUrl()
  mediaUrl!: string

  @IsEnum(MediaType)
  type!: MediaType

  @IsOptional()
  @IsString()
  caption?: string
}
