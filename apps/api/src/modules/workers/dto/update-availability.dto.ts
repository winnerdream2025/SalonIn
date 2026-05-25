import { IsEnum } from 'class-validator'
import { Availability } from '@salonin/types'

export class UpdateAvailabilityDto {
  @IsEnum(Availability)
  availability!: Availability
}
