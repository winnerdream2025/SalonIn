import { useState, useEffect, useCallback, useRef } from 'react'
import { salonsApi } from '@salonin/api-client'
import type { SalonCardData } from '@salonin/types'
import { useLocationStore } from '../store/locationStore'

export interface UseNearbySalonsOptions {
  specialty?: string
  radiusMiles?: number
  enabled?: boolean
}

export interface UseNearbySalonsResult {
  salons: SalonCardData[]
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  isExpanded: boolean
  usedRadius: number
  refresh: () => void
  loadMore: () => void
}

export function useNearbySalons(options: UseNearbySalonsOptions = {}): UseNearbySalonsResult {
  const { specialty, enabled = true } = options
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)
  const storeRadius = useLocationStore((s) => s.radiusMiles)
  const radiusMiles = options.radiusMiles ?? storeRadius

  const [salons, setSalons] = useState<SalonCardData[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [usedRadius, setUsedRadius] = useState(radiusMiles)
  const [tick, setTick] = useState(0)

  const isRefreshRef = useRef(false)

  const refresh = useCallback(() => {
    isRefreshRef.current = true
    setIsRefreshing(true)
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!enabled || lat == null || lng == null) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    let cancelled = false
    setError(null)

    if (isRefreshRef.current) {
      isRefreshRef.current = false
    } else {
      setSalons([])
      setIsLoading(true)
    }

    salonsApi
      .findNearby({ lat, lng, radiusMiles, specialty })
      .then((res) => {
        if (!cancelled) {
          setSalons(res.data)
          setNextCursor(res.nextCursor ?? undefined)
          setHasMore(res.hasMore)
          setIsExpanded(res.isExpanded ?? false)
          setUsedRadius(res.usedRadius ?? radiusMiles)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load salons'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      })

    return () => { cancelled = true }
  }, [enabled, lat, lng, radiusMiles, specialty, tick])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || lat == null || lng == null || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await salonsApi.findNearby({ lat, lng, radiusMiles, specialty, cursor: nextCursor })
      setSalons((prev) => [...prev, ...res.data])
      setNextCursor(res.nextCursor ?? undefined)
      setHasMore(res.hasMore)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load more salons'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, nextCursor, lat, lng, radiusMiles, specialty, isLoadingMore])

  return { salons, isLoading, isRefreshing, isLoadingMore, hasMore, error, isExpanded, usedRadius, refresh, loadMore }
}
