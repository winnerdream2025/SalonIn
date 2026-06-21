import { IsIn, IsOptional } from 'class-validator'

const ALLOWED_FOLDERS = ['avatars', 'uploads', 'portfolio', 'spaces', 'voice'] as const

export class UploadMediaDto {
  @IsOptional()
  @IsIn(ALLOWED_FOLDERS)
  folder?: typeof ALLOWED_FOLDERS[number]
}
