import { api } from './client'
import type {
  WorkerCardData,
  WorkerProfile,
  WorkerProfileFull,
  PortfolioItem,
  FindNearbyWorkersDto,
  UpdateAvailabilityDto,
  CursorResponse,
} from '@salonin/types'

export interface UpdateWorkerPayload {
  name?: string | undefined
  specialties?: string[] | undefined
  experienceYears?: number | undefined
  bio?: string | undefined
  photoUrl?: string | undefined
}

export interface AddPortfolioItemInput {
  mediaUrl: string
  type: string
  caption?: string
}

export const workersApi = {
  findNearby: (params: FindNearbyWorkersDto): Promise<CursorResponse<WorkerCardData>> =>
    api.get<CursorResponse<WorkerCardData>>('/workers/nearby', { params }).then((r) => r.data),

  getMe: (): Promise<WorkerProfileFull> =>
    api.get<WorkerProfileFull>('/workers/me').then((r) => r.data),

  getById: (id: string): Promise<WorkerProfileFull> =>
    api.get<WorkerProfileFull>(`/workers/${id}`).then((r) => r.data),

  updateProfile: (data: UpdateWorkerPayload): Promise<WorkerProfile> =>
    api.patch<WorkerProfile>('/workers/me', data).then((r) => r.data),

  updateAvailability: (data: UpdateAvailabilityDto): Promise<WorkerProfile> =>
    api.patch<WorkerProfile>('/workers/availability', data).then((r) => r.data),

  updateLocation: (lat: number, lng: number): Promise<void> =>
    api.post('/workers/location', { lat, lng }).then(() => undefined),

  addPortfolioItem: (data: AddPortfolioItemInput): Promise<PortfolioItem> =>
    api.post<PortfolioItem>('/workers/portfolio', data).then((r) => r.data),
}
