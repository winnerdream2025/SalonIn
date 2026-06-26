import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator'

export enum PostTypeDto {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  BEFORE_AFTER = 'BEFORE_AFTER',
  TEXT = 'TEXT',
}

export enum VisibilityDto {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

export class CreatePostDto {
  @IsEnum(PostTypeDto)
  type!: PostTypeDto

  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[]

  @IsOptional()
  @IsUrl()
  beforeUrl?: string

  @IsOptional()
  @IsUrl()
  afterUrl?: string

  @IsOptional()
  @IsString()
  serviceId?: string

  @IsOptional()
  @IsEnum(VisibilityDto)
  visibility?: VisibilityDto

  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean
}
