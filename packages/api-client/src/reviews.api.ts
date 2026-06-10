import { api } from './client'
import type { ReviewCardData, CreateReviewDto, CanReviewResponse } from '@salonin/types'

export const reviewsApi = {
  create(dto: CreateReviewDto): Promise<ReviewCardData> {
    return api.post<ReviewCardData>('/reviews', dto).then((r) => r.data)
  },

  getForUser(userId: string, page = 1, limit = 20): Promise<{ data: ReviewCardData[]; total: number; hasMore: boolean }> {
    return api
      .get<{ data: ReviewCardData[]; total: number; hasMore: boolean }>(`/reviews/user/${userId}?page=${page}&limit=${limit}`)
      .then((r) => r.data)
  },

  canReview(subjectId: string): Promise<CanReviewResponse> {
    return api.get<CanReviewResponse>(`/reviews/can-review/${subjectId}`).then((r) => r.data)
  },

  deleteReview(reviewId: string): Promise<void> {
    return api.delete(`/reviews/${reviewId}`).then(() => undefined)
  },

  replyToReview(reviewId: string, text: string): Promise<ReviewCardData> {
    return api.patch<ReviewCardData>(`/reviews/${reviewId}/reply`, { text }).then((r) => r.data)
  },
}
