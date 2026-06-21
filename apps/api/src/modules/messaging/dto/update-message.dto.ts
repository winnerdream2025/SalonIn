import { IsString, MaxLength } from 'class-validator'

export class UpdateMessageDto {
  @IsString()
  @MaxLength(2000)
  content!: string
}
