import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi, chatRequestsApi } from '@salonin/api-client'
import type { Message, ChatRequestPreview } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

const WS_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

export function useMessages(conversationId: string) {
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
  const [chatRequest, setChatRequest] = useState<ChatRequestPreview | null>(null)
  const socketRef = useRef<Socket | null>(null)

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
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [msg, ...prev]
      })
    })

    socket.on('typing', ({ userId: uid, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        isTyping ? (prev.includes(uid) ? prev : [...prev, uid]) : prev.filter((id) => id !== uid),
      )
    })

    socket.on('chat-request:updated', (updated: ChatRequestPreview) => {
      setChatRequest(updated)
    })

    socketRef.current = socket

    return () => {
      socket.emit('leave:conversation', { conversationId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, accessToken])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    messagesApi
      .getMessages(conversationId)
      .then((res) => {
        setMessages(res.data as Message[])
        setCursor(res.nextCursor ?? undefined)
        setHasMore(res.hasMore)
        void messagesApi.markAsRead(conversationId)
        void chatRequestsApi
          .getForConversation(conversationId)
          .then((cr) => setChatRequest(cr))
          .catch(() => undefined)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error('Failed to load messages'))
      })
      .finally(() => setIsLoading(false))
  }, [conversationId])

  const sendMessage = useCallback(
    async (content: string, mediaUrl?: string) => {
      const msg = await messagesApi.sendMessage(conversationId, content, mediaUrl)
      setMessages((prev) => [msg as Message, ...prev])
      setChatRequest((prev) =>
        prev?.status === 'PENDING'
          ? { ...prev, messageCount: (prev.messageCount ?? 0) + 1 }
          : prev,
      )
    },
    [conversationId],
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || cursor == null) return
    setIsLoadingMore(true)
    try {
      const res = await messagesApi.getMessages(conversationId, cursor)
      setMessages((prev) => [...prev, ...(res.data as Message[])])
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
      socketRef.current?.emit(isTypingNow ? 'typing:start' : 'typing:stop', {
        conversationId,
        userId: uid,
      })
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
    chatRequest,
    setChatRequest,
    sendMessage,
    loadMore,
    setTyping,
  }
}
