import { IsUUID } from 'class-validator'

export class CreateChatRequestDto {
  @IsUUID()
  receiverId!: string
}
