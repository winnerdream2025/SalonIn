import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi } from '@salonin/api-client'
import type { ConversationPreview, MessageStatus } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function useConversations(search?: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)

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

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
    })

    socket.on(
      'message:new',
      (payload: {
        conversationId: string
        senderId: string
        content?: string
        createdAt?: string
      }) => {
        if (payload.senderId === currentUserId) return

        setConversations((prev) => {
          const exists = prev.some((conv) => conv.id === payload.conversationId)
          if (!exists) return prev
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
      },
    )

    socket.on(
      'conversation:read',
      (payload: { conversationId: string; userId: string }) => {
        if (payload.userId !== currentUserId) return
        setConversations((prev) =>
          prev.map((conv) => (conv.id === payload.conversationId ? { ...conv, unreadCount: 0 } : conv)),
        )
      },
    )

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, currentUserId])

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
