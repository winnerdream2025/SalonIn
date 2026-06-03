import { IsIn } from 'class-validator'

export class UpdateChatRequestDto {
  @IsIn(['ACCEPT', 'DECLINE'])
  action!: 'ACCEPT' | 'DECLINE'
}
