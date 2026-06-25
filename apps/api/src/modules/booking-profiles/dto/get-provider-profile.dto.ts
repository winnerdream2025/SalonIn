import { IsIn, IsUUID } from 'class-validator'
import type { BookingProviderType } from '@salonin/types'

export class GetProviderProfileDto {
  @IsUUID()
  providerId!: string

  @IsIn(['professional', 'salon'])
  providerType!: BookingProviderType
}
