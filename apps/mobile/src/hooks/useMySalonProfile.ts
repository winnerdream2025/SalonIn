import { useState, useEffect, useCallback } from 'react'
import { salonsApi, jobsApi } from '@salonin/api-client'
import type { SalonCardData, JobPostCardData } from '@salonin/types'

export interface MySalonProfileState {
  salon: SalonCardData | null
  jobs: JobPostCardData[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useMySalonProfile(): MySalonProfileState {
  const [salon, setSalon] = useState<SalonCardData | null>(null)
  const [jobs, setJobs] = useState<JobPostCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    salonsApi
      .getMe()
      .then(async (data) => {
        if (cancelled) return
        setSalon(data)

        const jobsResult = await jobsApi
          .list({ cityId: data.cityId, salonId: data.id })
          .catch(() => ({ data: [] as JobPostCardData[] }))

        if (!cancelled) setJobs(jobsResult.data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load profile'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  return { salon, jobs, isLoading, error, refetch }
}
