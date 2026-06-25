import { api } from './client'
import type {
  WorkerCardData,
  WorkerProfile,
  WorkerProfileFull,
  PortfolioItem,
  FindNearbyWorkersDto,
  UpdateAvailabilityDto,
  CursorResponse,
  JobApplicationWithJob,
} from '@salonin/types'

export interface UpdateWorkerPayload {
  name?: string | undefined
  bio?: string | undefined
  photoUrl?: string | undefined
  specialties?: string[] | undefined
  experienceYears?: number | undefined
  radiusMiles?: number | undefined
  availability?: string | undefined
  languages?: string[] | undefined
  expectedPay?: string | undefined
  rateRange?: string | undefined
  rateNote?: string | undefined
  employmentTypes?: string[] | undefined
  licenseNumber?: string | undefined
  workerPayType?: string | undefined
  payMin?: number | undefined
  payMax?: number | undefined
  payPercentage?: number | undefined
  seatRate?: number | undefined
  availabilitySchedule?: {
    days: string[]
    startTime: string
    endTime: string
  } | undefined
  // Booking settings
  acceptsBookings?: boolean | undefined
  homeServiceEnabled?: boolean | undefined
  travelServiceEnabled?: boolean | undefined
  travelRadius?: number | undefined
  travelFee?: number | undefined
  availabilityEnabled?: boolean | undefined
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

  updateLocation: (
    lat: number,
    lng: number,
    city?: string,
    state?: string,
    country?: string,
  ): Promise<void> =>
    api.post('/workers/location', { lat, lng, city, state, country }).then(() => undefined),

  addPortfolioItem: (data: AddPortfolioItemInput): Promise<PortfolioItem> =>
    api.post<PortfolioItem>('/workers/portfolio', data).then((r) => r.data),

  deletePortfolioItem: (itemId: string): Promise<{ deleted: boolean }> =>
    api.delete<{ deleted: boolean }>(`/workers/portfolio/${itemId}`).then((r) => r.data),

  getMyApplications: (): Promise<JobApplicationWithJob[]> =>
    api.get<JobApplicationWithJob[]>('/workers/me/applications').then((r) => r.data),

  toggleSaveWorker: (workerId: string): Promise<{ saved: boolean }> =>
    api.post<{ saved: boolean }>(`/workers/${workerId}/save`).then((r) => r.data),

  getSavedWorkerIds: (): Promise<string[]> =>
    api.get<string[]>('/workers/saved/ids').then((r) => r.data),

  getSavedWorkers: (): Promise<WorkerProfileFull[]> =>
    api.get<WorkerProfileFull[]>('/workers/saved').then((r) => r.data),
}
