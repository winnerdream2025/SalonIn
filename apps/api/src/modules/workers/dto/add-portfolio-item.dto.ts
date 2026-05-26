import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator'
import { MediaType } from '@prisma/client'

export class AddPortfolioItemDto {
  @IsUrl()
  mediaUrl!: string

  @IsIn(Object.values(MediaType))
  type!: MediaType

  @IsOptional()
  @IsString()
  caption?: string
}
