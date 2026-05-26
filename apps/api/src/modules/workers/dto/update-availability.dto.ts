import { IsIn } from 'class-validator'
import type { Availability } from '@prisma/client'

export class UpdateAvailabilityDto {
  @IsIn(['NOW', 'TODAY', 'WEEKEND', 'NOT_AVAILABLE'])
  availability!: Availability
}
