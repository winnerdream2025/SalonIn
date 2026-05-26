import { IsEnum } from 'class-validator'
import { Availability } from '@prisma/client'

export class UpdateAvailabilityDto {
  @IsEnum(Availability)
  availability!: Availability
}
