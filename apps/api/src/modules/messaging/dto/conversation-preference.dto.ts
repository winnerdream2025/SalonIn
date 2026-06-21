import { IsBoolean } from 'class-validator'

export class PinConversationDto {
  @IsBoolean()
  isPinned!: boolean
}

export class ArchiveConversationDto {
  @IsBoolean()
  isArchived!: boolean
}

export class MuteConversationDto {
  @IsBoolean()
  isMuted!: boolean
}
