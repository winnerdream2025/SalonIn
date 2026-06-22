import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  textContent?: string

  @IsOptional()
  @IsEnum(['PUBLIC', 'FOLLOWERS', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[]
}
