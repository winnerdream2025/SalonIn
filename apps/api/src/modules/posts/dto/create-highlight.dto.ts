import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

export class CreateHighlightDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title!: string

  @IsOptional()
  @IsUrl()
  coverUrl?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storyIds?: string[]
}
