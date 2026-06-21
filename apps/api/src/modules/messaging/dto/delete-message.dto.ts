import { IsIn } from 'class-validator'

export class DeleteMessageDto {
  @IsIn(['me', 'all'])
  mode!: 'me' | 'all'
}
