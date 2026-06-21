import { IsIn, IsString } from 'class-validator'

export const SUPPORTED_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const

export class ReactMessageDto {
  @IsString()
  @IsIn(SUPPORTED_REACTIONS)
  emoji!: string
}
