import { IsBoolean } from 'class-validator'

export class UpdateHiringStatusDto {
  @IsBoolean()
  isHiring!: boolean
}
