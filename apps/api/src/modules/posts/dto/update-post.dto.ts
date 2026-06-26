import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { VisibilityDto } from './create-post.dto'

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string

  @IsOptional()
  @IsEnum(VisibilityDto)
  visibility?: VisibilityDto

  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean
}
