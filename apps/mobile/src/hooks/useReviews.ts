import { useState, useEffect, useCallback } from 'react'
import { reviewsApi } from '@salonin/api-client'
import type { ReviewCardData, CanReviewResponse } from '@salonin/types'

export function useReviews(subjectId: string | undefined) {
  const [reviews, setReviews] = useState<ReviewCardData[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!subjectId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await reviewsApi.getForUser(subjectId)
      setReviews(res.data)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load reviews'))
    } finally {
      setIsLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void load() }, [load])

  return { reviews, total, isLoading, error, refetch: load }
}

export function useCanReview(subjectId: string | undefined) {
  const [state, setState] = useState<CanReviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const check = useCallback(async () => {
    if (!subjectId) return
    setIsLoading(true)
    try {
      const res = await reviewsApi.canReview(subjectId)
      setState(res)
    } catch {
      setState(null)
    } finally {
      setIsLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void check() }, [check])

  return { canReview: state?.canReview ?? false, existingReview: state?.existingReview ?? null, isLoading, refresh: check }
}
