import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi } from '@salonin/api-client'
import type { ConversationPreview } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

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

export function useConversations() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)

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

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
    })

    socket.on('message:new', (payload: MessageNewPayload) => {
      if (payload.senderId === currentUserId) return

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === payload.conversationId
            ? {
                ...conv,
                unreadCount: conv.unreadCount + 1,
                lastMessage: {
                  content: payload.content ?? null,
                  mediaUrl: null,
                  createdAt: payload.createdAt ?? new Date().toISOString(),
                  isRead: false,
                  senderId: payload.senderId,
                },
              }
            : conv,
        ),
      )
    })

    socket.on('conversation:read', (payload: ConversationReadPayload) => {
      if (payload.userId !== currentUserId) return

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === payload.conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      )
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, currentUserId])

  return { conversations, isLoading, isRefreshing, error, refresh }
}
