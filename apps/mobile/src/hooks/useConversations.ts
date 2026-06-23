import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi } from '@salonin/api-client'
import type { ConversationPreview, MessageStatus, UserPresence } from '@salonin/types'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'

const WS_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

interface MessageNewPayload {
  conversationId: string
  senderId: string
  content?: string
  createdAt?: string
}

interface ConversationReadPayload {
  conversationId: string
  userId: string
}

export function useConversations(search?: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (searchTerm?: string, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    try {
      const data = await messagesApi.getConversations(searchTerm)
      setConversations(data)
      const total = data.reduce((s, c) => s + c.unreadCount, 0)
      useChatStore.getState().setUnreadCount(total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load conversations'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const refresh = useCallback(() => load(search, true), [load, search])

  // Initial load (no debounce)
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search reload
  useEffect(() => {
    if (search === undefined || search === '') return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      void load(search)
    }, 350)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search, load])

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
      // Sync badge count
      setConversations((latest) => {
        useChatStore.getState().setUnreadCount(latest.reduce((s, c) => s + c.unreadCount, 0))
        return latest
      })
    },
    [],
  )

  const removeConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id))
  }, [])

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
        // Cannot roll back without refetch; user can pull to refresh
      }
    },
    [removeConversation],
  )

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
    })

    socket.on('message:new', (payload: MessageNewPayload) => {
      if (payload.senderId === currentUserId) return

      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === payload.conversationId)
        if (!exists) {
          // New conversation will be fetched on next refresh
          return prev
        }
        return prev
          .map((conv) =>
            conv.id === payload.conversationId
              ? {
                  ...conv,
                  unreadCount: conv.unreadCount + 1,
                  lastMessage: {
                    content: payload.content ?? null,
                    mediaUrl: null,
                    type: 'TEXT',
                    status: 'sent' as MessageStatus,
                    createdAt: payload.createdAt ?? new Date().toISOString(),
                    isRead: false,
                    senderId: payload.senderId,
                  },
                  updatedAt: payload.createdAt ?? new Date().toISOString(),
                }
              : conv,
          )
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
      })
      setConversations((latest) => {
        useChatStore.getState().setUnreadCount(latest.reduce((s, c) => s + c.unreadCount, 0))
        return latest
      })
    })

    socket.on('conversation:read', (payload: ConversationReadPayload) => {
      if (payload.userId !== currentUserId) return

      setConversations((prev) => {
        const next = prev.map((conv) =>
          conv.id === payload.conversationId ? { ...conv, unreadCount: 0 } : conv,
        )
        useChatStore.getState().setUnreadCount(next.reduce((s, c) => s + c.unreadCount, 0))
        return next
      })
    })

    socket.on('presence:update', (updated: UserPresence) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.otherParticipant.userId === updated.userId
            ? { ...conv, otherParticipant: { ...conv.otherParticipant, presence: updated } }
            : conv,
        ),
      )
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, currentUserId])

  // Track which user IDs we're subscribed to — only re-subscribe when the set changes,
  // NOT on every conversations array mutation (which would cause a feedback loop).
  const subscribedIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!socketRef.current) return
    const newIds = new Set(conversations.map((c) => c.otherParticipant.userId))

    // Subscribe to IDs we haven't subscribed to yet
    for (const id of newIds) {
      if (!subscribedIdsRef.current.has(id)) {
        socketRef.current.emit('presence:subscribe', { userId: id })
        subscribedIdsRef.current.add(id)
      }
    }
    // Unsubscribe from IDs no longer in the list
    for (const id of subscribedIdsRef.current) {
      if (!newIds.has(id)) {
        socketRef.current?.emit('presence:unsubscribe', { userId: id })
        subscribedIdsRef.current.delete(id)
      }
    }
  }, [conversations])

  return {
    conversations,
    isLoading,
    isRefreshing,
    error,
    refresh,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
  }
}
