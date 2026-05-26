import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator'
import type { MediaType } from '@prisma/client'

export class AddPortfolioItemDto {
  @IsUrl()
  mediaUrl!: string

  @IsIn(['IMAGE', 'VIDEO'])
  type!: MediaType

  @IsOptional()
  @IsString()
  caption?: string
}
