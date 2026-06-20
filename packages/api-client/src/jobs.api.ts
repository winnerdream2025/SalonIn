import { api } from './client'
import type {
  JobPost,
  JobPostCardData,
  JobPostDetail,
  CreateJobPostDto,
  PaginatedResponse,
  JobApplicationDetail,
  AppStatus,
} from '@salonin/types'

export interface ListJobsParams {
  /** Latitude for geo-based search (preferred over cityId) */
  lat?: number | undefined
  /** Longitude for geo-based search (preferred over cityId) */
  lng?: number | undefined
  /** Search radius in miles (default: 50) */
  radiusMiles?: number | undefined
  /** @deprecated Use lat/lng instead. Kept for backward compatibility. */
  cityId?: string | undefined
  salonId?: string | undefined
  specialty?: string | undefined
  type?: string | undefined
  listingType?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export const jobsApi = {
  create: (data: CreateJobPostDto): Promise<JobPost> =>
    api.post<JobPost>('/jobs', data).then((r) => r.data),

  list: (params: ListJobsParams): Promise<PaginatedResponse<JobPostCardData>> =>
    api.get<PaginatedResponse<JobPostCardData>>('/jobs', { params }).then((r) => r.data),

  getById: (id: string): Promise<JobPostDetail> =>
    api.get<JobPostDetail>(`/jobs/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CreateJobPostDto>): Promise<JobPost> =>
    api.patch<JobPost>(`/jobs/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`/jobs/${id}`).then(() => undefined),

  apply: (jobId: string): Promise<{ success: true }> =>
    api.post<{ success: true }>(`/jobs/${jobId}/apply`).then((r) => r.data),

  getApplicants: (jobId: string): Promise<JobApplicationDetail[]> =>
    api.get<JobApplicationDetail[]>(`/jobs/${jobId}/applicants`).then((r) => r.data),

  updateApplicationStatus: (
    jobId: string,
    applicationId: string,
    status: AppStatus,
  ): Promise<void> =>
    api
      .patch(`/jobs/${jobId}/applicants/${applicationId}`, { status })
      .then(() => undefined),

  toggleSave: (jobId: string): Promise<{ saved: boolean }> =>
    api.post<{ saved: boolean }>(`/jobs/${jobId}/save`).then((r) => r.data),

  getSavedJobIds: (): Promise<string[]> =>
    api.get<string[]>('/jobs/saved/ids').then((r) => r.data),
}
