import { useCallback, useEffect, useState } from 'react'
import { messagesApi } from '@salonin/api-client'
import type { ConversationPreview } from '@salonin/types'

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    try {
      const data = await messagesApi.getConversations()
      setConversations(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load conversations'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const refresh = useCallback(() => load(true), [load])

  useEffect(() => {
    void load()
  }, [load])

  return { conversations, isLoading, isRefreshing, error, refresh }
}
