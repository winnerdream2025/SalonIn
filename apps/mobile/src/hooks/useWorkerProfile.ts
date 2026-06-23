import { useState, useEffect, useCallback } from 'react'
import { workersApi } from '@salonin/api-client'
import type { WorkerProfileFull } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

export function useWorkerProfile(id: string) {
  const [profile, setProfile] = useState<WorkerProfileFull | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    workersApi
      .getById(id)
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load profile'))
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { profile, isLoading, error }
}

export function useMyWorkerProfile() {
  const [profile, setProfile] = useState<WorkerProfileFull | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const user = useAuthStore((s) => s.user)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    workersApi
      .getMe()
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load profile'))
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [user, tick])

  return { profile, isLoading, error, refetch }
}
