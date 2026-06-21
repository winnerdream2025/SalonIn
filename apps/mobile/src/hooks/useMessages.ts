import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { messagesApi, chatRequestsApi } from '@salonin/api-client'
import type { Message, MessageStatus, ChatRequestPreview, UserPresence, TypingEvent, ReactionEmoji } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

function dedupeById(msgs: Message[]): Message[] {
  const seen = new Set<string>()
  return msgs.filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

const WS_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

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
  const [chatRequest, setChatRequest] = useState<ChatRequestPreview | null>(null)
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
      // Confirm delivery to the sender
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

    socket.on('chat-request:updated', (updated: ChatRequestPreview) => {
      setChatRequest(updated)
    })

    socket.on('message:updated', (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg, isEdited: true } : m)))
    })

    socket.on('message:deleted', (payload: { messageId: string; userId: string; mode: 'me' | 'all' }) => {
      setMessages((prev) => {
        if (payload.mode === 'all') {
          return prev.filter((m) => m.id !== payload.messageId)
        }
        if (payload.userId === userId) {
          return prev.filter((m) => m.id !== payload.messageId)
        }
        return prev
      })
    })

    socket.on('message:reaction', (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)))
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
    async (
      opts: {
        content?: string
        mediaUrl?: string
        mediaUrls?: string[]
        thumbnailUrl?: string
        replyToId?: string
        audioUrl?: string
        duration?: number
        waveformData?: number[]
        fileName?: string
        fileSize?: number
        mimeType?: string
        contactName?: string
        contactPhone?: string
        latitude?: number
        longitude?: number
        locationName?: string
        type?: string
      },
    ) => {
      const {
        content = '', audioUrl, mediaUrl, mediaUrls, thumbnailUrl,
        replyToId, duration, waveformData,
        fileName, fileSize, mimeType,
        contactName, contactPhone,
        latitude, longitude, locationName,
        type: explicitType,
      } = opts

      const messageType =
        explicitType ??
        (audioUrl ? 'VOICE'
          : contactName ? 'CONTACT'
          : latitude != null ? 'LOCATION'
          : fileName ? 'DOCUMENT'
          : mediaUrls?.length ? 'IMAGE'
          : mediaUrl ? 'MEDIA'
          : 'TEXT')

      const tempId = `optimistic-${Date.now()}`
      const optimistic: Message = {
        id: tempId,
        senderId: userId ?? '',
        conversationId,
        content: content || null,
        mediaUrl: mediaUrl ?? mediaUrls?.[0] ?? null,
        mediaUrls: mediaUrls ?? null,
        thumbnailUrl: thumbnailUrl ?? null,
        audioUrl: audioUrl ?? null,
        duration: duration ?? null,
        waveformData: waveformData ?? null,
        type: messageType,
        status: 'sending',
        createdAt: new Date().toISOString(),
        isRead: false,
        isSystem: false,
        replyToId: replyToId ?? null,
        fileName: fileName ?? null,
        fileSize: fileSize ?? null,
        mimeType: mimeType ?? null,
        contactName: contactName ?? null,
        contactPhone: contactPhone ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationName: locationName ?? null,
      }

      setMessages((prev) => dedupeById([optimistic, ...prev]))

      try {
        const msg = await messagesApi.sendMessage(conversationId, {
          content,
          mediaUrl,
          mediaUrls,
          thumbnailUrl,
          replyToId,
          audioUrl,
          duration,
          waveformData,
          fileName,
          fileSize,
          mimeType,
          contactName,
          contactPhone,
          latitude,
          longitude,
          locationName,
          type: messageType,
        })
        const serverMsg = msg as Message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId)
          return dedupeById([serverMsg, ...filtered])
        })
        setChatRequest((prev) =>
          prev?.status === 'PENDING'
            ? { ...prev, messageCount: (prev.messageCount ?? 0) + 1 }
            : prev,
        )
        void chatRequestsApi
          .getForConversation(conversationId)
          .then((cr) => { if (cr) setChatRequest(cr) })
          .catch(() => undefined)
        return serverMsg
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
        )
        throw e
      }
    },
    [conversationId, userId],
  )

  const retrySend = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId && m.status === 'failed')
      if (!msg) return
      // Remove the failed optimistic message and re-send with same content
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      return sendMessage({
        content: msg.content ?? undefined,
        mediaUrl: msg.mediaUrl ?? undefined,
        mediaUrls: msg.mediaUrls ?? undefined,
        thumbnailUrl: msg.thumbnailUrl ?? undefined,
        audioUrl: msg.audioUrl ?? undefined,
        duration: msg.duration ?? undefined,
        waveformData: msg.waveformData ?? undefined,
        fileName: msg.fileName ?? undefined,
        fileSize: msg.fileSize ?? undefined,
        mimeType: msg.mimeType ?? undefined,
        contactName: msg.contactName ?? undefined,
        contactPhone: msg.contactPhone ?? undefined,
        latitude: msg.latitude ?? undefined,
        longitude: msg.longitude ?? undefined,
        locationName: msg.locationName ?? undefined,
        type: msg.type ?? undefined,
        replyToId: msg.replyToId ?? undefined,
      })
    },
    [messages, sendMessage],
  )

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const previous = messages.find((m) => m.id === messageId)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m)),
      )
      try {
        const msg = await messagesApi.editMessage(conversationId, messageId, content)
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)))
        return msg
      } catch (e) {
        if (previous) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, content: previous.content, isEdited: previous.isEdited } : m,
            ),
          )
        }
        throw e
      }
    },
    [conversationId, messages],
  )

  const deleteMessage = useCallback(
    async (messageId: string, mode: 'me' | 'all') => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      try {
        await messagesApi.deleteMessage(conversationId, messageId, mode)
      } catch (e) {
        void messagesApi.getMessages(conversationId).then((res) => {
          setMessages(dedupeById(res.data as Message[]))
        })
        throw e
      }
    },
    [conversationId],
  )

  const reactToMessage = useCallback(
    async (messageId: string, emoji: string) => {
      const previous = messages.find((m) => m.id === messageId)?.reactions ?? []
      const typedEmoji = emoji as ReactionEmoji
      const next = (() => {
        const own = previous.find((r) => r.userId === userId)
        if (own?.emoji === typedEmoji) return previous.filter((r) => r.userId !== userId)
        if (own) return previous.map((r) => (r.userId === userId ? { ...r, emoji: typedEmoji } : r))
        return [...previous, { userId: userId ?? '', emoji: typedEmoji }]
      })()
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m)))
      try {
        const msg = await messagesApi.reactToMessage(conversationId, messageId, typedEmoji)
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)))
        return msg
      } catch (e) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: previous } : m)))
        throw e
      }
    },
    [conversationId, messages, userId],
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
    chatRequest,
    setChatRequest,
    presence,
    sendMessage,
    retrySend,
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    setTyping,
  }
}
