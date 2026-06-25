import { api } from './client'
import type { SalonCardData, SalonProfile, SalonProfileFull } from '@salonin/types'

export interface UpdateSalonPayload {
  name?: string | undefined
  description?: string | undefined
  photoUrls?: string[] | undefined
  specialties?: string[] | undefined
  isHiring?: boolean | undefined
  acceptsBookings?: boolean | undefined
}

export const salonsApi = {
  getMe: (): Promise<SalonCardData> =>
    api.get<SalonCardData>('/salons/me').then((r) => r.data),

  getById: (id: string): Promise<SalonProfileFull> =>
    api.get<SalonProfileFull>(`/salons/${id}`).then((r) => r.data),

  updateProfile: (data: UpdateSalonPayload): Promise<SalonProfile> =>
    api.patch<SalonProfile>('/salons/me', data).then((r) => r.data),

  setHiringStatus: (isHiring: boolean): Promise<SalonProfile> =>
    api.patch<SalonProfile>('/salons/hiring-status', { isHiring }).then((r) => r.data),

  updateLocation: (
    lat: number,
    lng: number,
    city?: string,
    state?: string,
    country?: string,
  ): Promise<void> =>
    api.post('/salons/location', { lat, lng, city, state, country }).then(() => undefined),
}
