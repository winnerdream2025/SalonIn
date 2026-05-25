'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useConversations } from '../../hooks/useConversations'
import { useMessages } from '../../hooks/useMessages'
import { ConversationItem } from '../../components/ConversationItem'
import { MessageBubble } from '../../components/MessageBubble'
import { useAuthStore } from '../../store/authStore'
import type { ConversationPreview } from '@salonin/types'

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState<ConversationPreview | null>(null)
  const { conversations, isLoading: convLoading } = useConversations()

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0A0A0A', overflow: 'hidden' }}>
      <aside
        style={{
          width: 300,
          borderRight: '1px solid #1E1E1E',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 56,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #1E1E1E',
            flexShrink: 0,
          }}
        >
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Messages</h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convLoading
            ? Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)
            : conversations.length === 0
              ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color: '#555',
                    fontSize: 14,
                  }}
                >
                  No conversations yet
                </div>
              )
              : conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConv?.id === conv.id}
                  onClick={() => setSelectedConv(conv)}
                />
              ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedConv != null ? (
          <ChatPanel conversation={selectedConv} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              💬
            </div>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>
              Select a conversation
            </p>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
              Choose from the list to start chatting
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function ChatPanel({ conversation }: { conversation: ConversationPreview }) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { messages, isLoading, sendMessage, typingUsers, setTyping } = useMessages(
    conversation.id,
  )
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setTyping(false)
    await sendMessage(text)
  }, [draft, sendMessage, setTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const othersTyping = typingUsers.filter((uid) => uid !== currentUserId)
  const displayedMessages = [...messages].reverse()

  return (
    <>
      <div
        style={{
          height: 56,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #1E1E1E',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#1A1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {conversation.otherParticipant.name[0]?.toUpperCase() ?? '?'}
        </div>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
          {conversation.otherParticipant.name}
        </span>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <MsgSkeleton key={i} isSelf={i % 3 === 0} />
            ))
          : displayedMessages.map((msg, index) => {
              const isSelf = msg.senderId === currentUserId
              const showAvatar =
                !isSelf &&
                (index === 0 || displayedMessages[index - 1]?.senderId !== msg.senderId)
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isSelf={isSelf}
                  showAvatar={showAvatar}
                  senderName={conversation.otherParticipant.name}
                  senderPhotoUrl={conversation.otherParticipant.photoUrl}
                />
              )
            })}
      </div>

      {othersTyping.length > 0 && (
        <div style={{ padding: '4px 20px', color: '#888', fontSize: 12, fontStyle: 'italic' }}>
          typing…
        </div>
      )}

      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid #1E1E1E',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setTyping(e.target.value.length > 0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex: 1,
            backgroundColor: '#1E1E1E',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '10px 14px',
            fontSize: 14,
            outline: 'none',
            resize: 'none',
            maxHeight: 120,
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!draft.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: draft.trim() ? '#D85A30' : '#1E1E1E',
            border: 'none',
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </>
  )
}

function ConvSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        alignItems: 'center',
      }}
    >
      <div
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E1E1E', flexShrink: 0 }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 11, width: 120, borderRadius: 6, backgroundColor: '#1E1E1E' }} />
        <div style={{ height: 10, width: 180, borderRadius: 5, backgroundColor: '#1E1E1E' }} />
      </div>
    </div>
  )
}

function MsgSkeleton({ isSelf }: { isSelf: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        padding: '2px 16px',
      }}
    >
      <div
        style={{
          width: isSelf ? 200 : 160,
          height: 40,
          borderRadius: 16,
          backgroundColor: '#1E1E1E',
        }}
      />
    </div>
  )
}
