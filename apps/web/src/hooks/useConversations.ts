import { useCallback, useEffect, useState } from 'react'
import { messagesApi } from '@salonin/api-client'
import type { ConversationPreview } from '@salonin/types'

export function useConversations(search?: string) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const updateConversation = useCallback(
    (id: string, patch: Partial<ConversationPreview>) => {
      setConversations((prev) =>
        prev
          .map((conv) => (conv.id === id ? { ...conv, ...patch } : conv))
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          }),
      )
    },
    [],
  )

  const removeConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id))
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await messagesApi.getConversations(search)
      setConversations(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load conversations'))
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const pinConversation = useCallback(
    async (id: string, isPinned: boolean) => {
      updateConversation(id, { isPinned })
      try {
        await messagesApi.pinConversation(id, isPinned)
      } catch {
        updateConversation(id, { isPinned: !isPinned })
      }
    },
    [updateConversation],
  )

  const archiveConversation = useCallback(
    async (id: string, isArchived: boolean) => {
      updateConversation(id, { isArchived })
      try {
        await messagesApi.archiveConversation(id, isArchived)
      } catch {
        updateConversation(id, { isArchived: !isArchived })
      }
    },
    [updateConversation],
  )

  const muteConversation = useCallback(
    async (id: string, isMuted: boolean) => {
      updateConversation(id, { isMuted })
      try {
        await messagesApi.muteConversation(id, isMuted)
      } catch {
        updateConversation(id, { isMuted: !isMuted })
      }
    },
    [updateConversation],
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      removeConversation(id)
      try {
        await messagesApi.deleteConversation(id)
      } catch {
        // Cannot roll back without refetch
      }
    },
    [removeConversation],
  )

  return {
    conversations,
    isLoading,
    error,
    refresh: load,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
  }
}
