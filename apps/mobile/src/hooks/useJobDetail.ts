import { useState, useEffect } from 'react'
import { jobsApi, workersApi } from '@salonin/api-client'
import type { JobPostDetail, JobApplicationWithJob } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

export function useJobDetail(id: string) {
  const [job, setJob] = useState<JobPostDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    jobsApi
      .getById(id)
      .then((data) => { if (!cancelled) setJob(data) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Failed to load job'))
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { job, isLoading, error }
}

export function useMyApplications() {
  const [applications, setApplications] = useState<JobApplicationWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    let cancelled = false
    workersApi
      .getMyApplications()
      .then((data) => { if (!cancelled) setApplications(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [user])

  return { applications, isLoading }
}
