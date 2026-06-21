import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi } from '@salonin/api-client'
import type { Message, MessageStatus, UserPresence, TypingEvent } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function dedupeById(msgs: Message[]): Message[] {
  const seen = new Set<string>()
  return msgs.filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

export function useMessages(conversationId: string, otherUserId?: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [presence, setPresence] = useState<UserPresence | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
    })

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join:conversation', { conversationId })
    })

    socket.on('disconnect', () => setIsConnected(false))

    socket.on('message:received', (msg: Message) => {
      if (msg.senderId === userId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [msg, ...prev]
      })
      socket.emit('message:delivered', { conversationId, messageIds: [msg.id] })
    })

    socket.on(
      'message:status',
      (payload: {
        conversationId: string
        messageIds: string[]
        status: MessageStatus
        deliveredAt?: string
        readAt?: string
      }) => {
        if (payload.conversationId !== conversationId) return
        setMessages((prev) =>
          prev.map((m) => {
            if (!payload.messageIds.includes(m.id)) return m
            const patch: Partial<Message> = { status: payload.status }
            if (payload.status === 'delivered') {
              patch.deliveredAt = payload.deliveredAt ?? new Date().toISOString()
            }
            if (payload.status === 'read') {
              patch.readAt = payload.readAt ?? new Date().toISOString()
              patch.isRead = true
            }
            return { ...m, ...patch }
          }),
        )
      },
    )

    socket.on('typing', ({ userId: uid, isTyping }: TypingEvent) => {
      setTypingUsers((prev) =>
        isTyping ? (prev.includes(uid) ? prev : [...prev, uid]) : prev.filter((id) => id !== uid),
      )
    })

    socket.on('presence:update', (updated: UserPresence) => {
      setPresence((prev) => (prev?.userId === updated.userId ? updated : prev))
    })

    socketRef.current = socket

    heartbeatRef.current = setInterval(() => {
      socket.emit('presence:heartbeat')
    }, 30000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      socket.emit('leave:conversation', { conversationId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, accessToken, userId])

  useEffect(() => {
    if (!otherUserId || !userId || !conversationId) return
    void messagesApi.getPresence(otherUserId).then((p) => setPresence(p))
    socketRef.current?.emit('presence:subscribe', { userId: otherUserId })
    return () => {
      socketRef.current?.emit('presence:unsubscribe', { userId: otherUserId })
    }
  }, [otherUserId, userId, conversationId])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    messagesApi
      .getMessages(conversationId)
      .then((res) => {
        setMessages(dedupeById(res.data as Message[]))
        setCursor(res.nextCursor ?? undefined)
        setHasMore(res.hasMore)
        void messagesApi.markAsRead(conversationId).then(() => {
          socketRef.current?.emit('conversation:read', { conversationId })
        })
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error('Failed to load messages'))
      })
      .finally(() => setIsLoading(false))
  }, [conversationId])

  useEffect(() => {
    if (!userId || messages.length === 0) return
    const hasUnreadFromOther = messages.some((m) => m.senderId !== userId && m.status !== 'read')
    if (!hasUnreadFromOther) return
    const timeout = setTimeout(() => {
      void messagesApi.markAsRead(conversationId).then(() => {
        socketRef.current?.emit('conversation:read', { conversationId })
      })
    }, 400)
    return () => clearTimeout(timeout)
  }, [messages, conversationId, userId])

  const sendMessage = useCallback(
    async (content: string, mediaUrl?: string) => {
      const tempId = `optimistic-${Date.now()}`
      const optimistic: Message = {
        id: tempId,
        senderId: userId ?? '',
        conversationId,
        content,
        mediaUrl: mediaUrl ?? null,
        type: mediaUrl ? 'MEDIA' : 'TEXT',
        status: 'sending',
        createdAt: new Date().toISOString(),
        isRead: false,
        isSystem: false,
      }

      setMessages((prev) => dedupeById([optimistic, ...prev]))

      try {
        const msg = await messagesApi.sendMessage(conversationId, { content, mediaUrl })
        const serverMsg = msg as Message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId)
          return dedupeById([serverMsg, ...filtered])
        })
        return serverMsg
      } catch (e) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
        throw e
      }
    },
    [conversationId, userId],
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || cursor == null) return
    setIsLoadingMore(true)
    try {
      const res = await messagesApi.getMessages(conversationId, cursor)
      setMessages((prev) => dedupeById([...prev, ...(res.data as Message[])]))
      setCursor(res.nextCursor ?? undefined)
      setHasMore(res.hasMore)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load more'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, cursor, conversationId])

  const setTyping = useCallback(
    (isTypingNow: boolean) => {
      const uid = userId ?? ''
      if (isTypingNow) {
        if (!isTypingRef.current) {
          socketRef.current?.emit('typing:start', { conversationId, userId: uid })
          isTypingRef.current = true
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => {
          socketRef.current?.emit('typing:stop', { conversationId, userId: uid })
          isTypingRef.current = false
        }, 2000)
      } else {
        if (isTypingRef.current) {
          socketRef.current?.emit('typing:stop', { conversationId, userId: uid })
          isTypingRef.current = false
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    },
    [conversationId, userId],
  )

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isConnected,
    typingUsers,
    presence,
    sendMessage,
    loadMore,
    setTyping,
  }
}
