import { useCallback, useEffect, useState } from 'react'
import { chatRequestsApi } from '@salonin/api-client'
import type { ChatRequestPreview } from '@salonin/types'

export function useChatRequests() {
  const [requests, setRequests] = useState<ChatRequestPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    try {
      const data = await chatRequestsApi.getReceived()
      setRequests(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load requests'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(() => load(true), [load])

  const respond = useCallback(
    async (id: string, action: 'ACCEPT' | 'DECLINE') => {
      const updated = await chatRequestsApi.respond(id, action)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r)).filter((r) => r.status === 'PENDING'),
      )
      return updated
    },
    [],
  )

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  return { requests, isLoading, isRefreshing, error, refresh, respond, pendingCount }
}
