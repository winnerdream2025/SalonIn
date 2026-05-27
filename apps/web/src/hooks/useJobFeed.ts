import { useState, useEffect, useCallback, useRef } from 'react'
import { jobsApi } from '@salonin/api-client'
import type { JobPostCardData } from '@salonin/types'
import { useLocationStore } from '../store/locationStore'

export interface UseJobFeedOptions {
  specialty?: string
  type?: string
  salonId?: string
}

export interface UseJobFeedResult {
  jobs: JobPostCardData[]
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  refresh: () => void
  loadMore: () => void
}

export function useJobFeed(options: UseJobFeedOptions = {}): UseJobFeedResult {
  const { specialty, type, salonId } = options
  const cityId = useLocationStore((s) => s.cityId)

  const [jobs, setJobs] = useState<JobPostCardData[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  const isRefreshRef = useRef(false)

  const refresh = useCallback(() => {
    isRefreshRef.current = true
    setIsRefreshing(true)
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!cityId) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    let cancelled = false
    setError(null)

    if (isRefreshRef.current) {
      isRefreshRef.current = false
    } else {
      setJobs([])
      setPage(1)
      setIsLoading(true)
    }

    jobsApi
      .list({ cityId, specialty, type, salonId, page: 1, limit: 20 })
      .then((res) => {
        if (!cancelled) {
          setJobs(res.data)
          setPage(1)
          setHasMore(res.hasMore)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load jobs'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      })

    return () => { cancelled = true }
  }, [cityId, specialty, type, salonId, tick])

  const loadMore = useCallback(async () => {
    if (!hasMore || !cityId || isLoadingMore) return
    const nextPage = page + 1
    setIsLoadingMore(true)
    try {
      const res = await jobsApi.list({ cityId, specialty, type, salonId, page: nextPage, limit: 20 })
      setJobs((prev) => [...prev, ...res.data])
      setPage(nextPage)
      setHasMore(res.hasMore)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load more jobs'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, cityId, specialty, type, salonId, page, isLoadingMore])

  return { jobs, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore }
}
