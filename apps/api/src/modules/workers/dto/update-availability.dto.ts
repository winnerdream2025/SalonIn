import { IsIn } from 'class-validator'
import { Availability } from '@prisma/client'

export class UpdateAvailabilityDto {
  @IsIn(Object.values(Availability))
  availability!: Availability
}
