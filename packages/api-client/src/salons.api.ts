import { api } from './client'
import type { SalonCardData, SalonProfile } from '@salonin/types'

export interface UpdateSalonPayload {
  name?: string | undefined
  bio?: string | undefined
  specialties?: string[] | undefined
  address?: string | undefined
}

export const salonsApi = {
  getMe: (): Promise<SalonCardData> =>
    api.get<SalonCardData>('/salons/me').then((r) => r.data),

  getById: (id: string): Promise<SalonCardData> =>
    api.get<SalonCardData>(`/salons/${id}`).then((r) => r.data),

  updateProfile: (data: UpdateSalonPayload): Promise<SalonProfile> =>
    api.patch<SalonProfile>('/salons/me', data).then((r) => r.data),

  setHiringStatus: (isHiring: boolean): Promise<SalonProfile> =>
    api.patch<SalonProfile>('/salons/hiring-status', { isHiring }).then((r) => r.data),
}
