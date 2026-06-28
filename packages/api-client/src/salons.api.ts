import { api } from './client'
import type {
  SalonCardData,
  SalonProfile,
  SalonProfileFull,
  FindNearbyWorkersDto,
  CursorResponse,
} from '@salonin/types'

export interface UpdateSalonPayload {
  name?: string | undefined
  description?: string | undefined
  photoUrls?: string[] | undefined
  specialties?: string[] | undefined
  isHiring?: boolean | undefined
  acceptsBookings?: boolean | undefined
  instantBooking?: boolean | undefined
  requiresDeposit?: boolean | undefined
  cancellationWindowHours?: number | undefined
  rescheduleWindowHours?: number | undefined
  lateFeeEnabled?: boolean | undefined
  lateFeeAmount?: number | undefined
}

export const salonsApi = {
  findNearby: (params: FindNearbyWorkersDto): Promise<CursorResponse<SalonCardData>> =>
    api.get<CursorResponse<SalonCardData>>('/salons/nearby', { params }).then((r) => r.data),

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

  inviteWorker: (workerId: string): Promise<SalonStaffRecord> =>
    api.post<SalonStaffRecord>(`/salons/staff/invite/${workerId}`).then((r) => r.data),

  getStaff: (): Promise<SalonStaffRecord[]> =>
    api.get<SalonStaffRecord[]>('/salons/staff').then((r) => r.data),

  removeStaff: (staffId: string): Promise<void> =>
    api.delete(`/salons/staff/${staffId}`).then(() => undefined),

  getMyInvites: (): Promise<SalonStaffRecord[]> =>
    api.get<SalonStaffRecord[]>('/salons/staff/invites').then((r) => r.data),

  acceptInvite: (staffId: string): Promise<SalonStaffRecord> =>
    api.patch<SalonStaffRecord>(`/salons/staff/invites/${staffId}/accept`).then((r) => r.data),

  declineInvite: (staffId: string): Promise<SalonStaffRecord> =>
    api.patch<SalonStaffRecord>(`/salons/staff/invites/${staffId}/decline`).then((r) => r.data),
}

export interface SalonStaffRecord {
  id: string
  salonId: string
  workerId: string
  status: 'INVITED' | 'ACTIVE' | 'REMOVED' | 'DECLINED'
  note: string | null
  invitedAt: string
  respondedAt: string | null
  worker?: { id: string; name: string; photoUrl: string | null; specialties: string[]; city: string | null; state: string | null }
  salon?: { id: string; name: string; photoUrls: string[]; city: string | null; state: string | null }
}
