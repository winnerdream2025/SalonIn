import { api } from './client'
import type {
  JobPost,
  JobPostCardData,
  CreateJobPostDto,
  PaginatedResponse,
} from '@salonin/types'

export interface ListJobsParams {
  cityId: string
  specialty?: string | undefined
  type?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export const jobsApi = {
  create: (data: CreateJobPostDto): Promise<JobPost> =>
    api.post<JobPost>('/jobs', data).then((r) => r.data),

  list: (params: ListJobsParams): Promise<PaginatedResponse<JobPostCardData>> =>
    api.get<PaginatedResponse<JobPostCardData>>('/jobs', { params }).then((r) => r.data),

  getById: (id: string): Promise<JobPost> =>
    api.get<JobPost>(`/jobs/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CreateJobPostDto>): Promise<JobPost> =>
    api.patch<JobPost>(`/jobs/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`/jobs/${id}`).then(() => undefined),
}
