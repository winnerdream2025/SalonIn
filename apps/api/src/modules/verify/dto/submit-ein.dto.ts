import { IsString, Matches } from 'class-validator'

export class SubmitEinDto {
  @IsString()
  @Matches(/^\d{2}-?\d{7}$/, { message: 'EIN must be in format XX-XXXXXXX' })
  ein!: string
}
