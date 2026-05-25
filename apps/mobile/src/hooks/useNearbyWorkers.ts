import { useState, useEffect, useCallback, useRef } from 'react'
import { workersApi } from '@salonin/api-client'
import type { WorkerCardData } from '@salonin/types'
import type { Availability } from '@salonin/types'
import { useLocationStore } from '../store/locationStore'

export interface UseNearbyWorkersOptions {
  specialty?: string
  availability?: Availability
  radiusMiles?: number
}

export interface UseNearbyWorkersResult {
  workers: WorkerCardData[]
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  refresh: () => void
  loadMore: () => void
}

export function useNearbyWorkers(options: UseNearbyWorkersOptions = {}): UseNearbyWorkersResult {
  const { specialty, availability, radiusMiles = 25 } = options
  const cityId = useLocationStore((s) => s.cityId)
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)

  const [workers, setWorkers] = useState<WorkerCardData[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
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
    if (!cityId || lat == null || lng == null) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    let cancelled = false
    setError(null)

    if (isRefreshRef.current) {
      isRefreshRef.current = false
    } else {
      setWorkers([])
      setIsLoading(true)
    }

    workersApi
      .findNearby({ cityId, lat, lng, radiusMiles, specialty, availability })
      .then((res) => {
        if (!cancelled) {
          setWorkers(res.data)
          setNextCursor(res.nextCursor ?? undefined)
          setHasMore(res.hasMore)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load workers'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      })

    return () => { cancelled = true }
  }, [cityId, lat, lng, radiusMiles, specialty, availability, tick])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || !cityId || lat == null || lng == null || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await workersApi.findNearby({
        cityId, lat, lng, radiusMiles, specialty, availability, cursor: nextCursor,
      })
      setWorkers((prev) => [...prev, ...res.data])
      setNextCursor(res.nextCursor ?? undefined)
      setHasMore(res.hasMore)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load more workers'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, nextCursor, cityId, lat, lng, radiusMiles, specialty, availability, isLoadingMore])

  return { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore }
}
