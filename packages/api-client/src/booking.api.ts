import { api } from './client'
import type { ProviderBookingProfile, BookingProviderType, ClientBookingItem } from '@salonin/types'

export const bookingProfileApi = {
  /** Resolve the external booking profile for a SalonIn provider. */
  getByProvider: (
    providerId: string,
    providerType: BookingProviderType,
  ): Promise<ProviderBookingProfile | null> =>
    api
      .get<{ data: ProviderBookingProfile | null }>('/booking-profiles/provider', {
        params: { providerId, providerType },
      })
      .then((r) => r.data.data)
      .catch(() => null),

  /** Fetch the authenticated client's bookings across all active Havana tenants. */
  getMyBookings: (): Promise<ClientBookingItem[]> =>
    api
      .get<{ data: ClientBookingItem[] }>('/booking-profiles/my-bookings')
      .then((r) => r.data.data)
      .catch(() => []),

  /**
   * Auto-create a Havanabook tenant for the provider and store credentials.
   * Idempotent — safe to call even if a profile already exists.
   */
  autoSetup: (payload: {
    providerId: string
    providerType: BookingProviderType
    businessName: string
    email: string
    phone?: string
  }): Promise<ProviderBookingProfile | null> =>
    api
      .post<{ data: ProviderBookingProfile }>('/booking-profiles/auto-setup', payload)
      .then((r) => r.data.data)
      .catch(() => null),
}
