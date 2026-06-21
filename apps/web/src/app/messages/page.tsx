'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useConversations } from '../../hooks/useConversations'
import { useMessages } from '../../hooks/useMessages'
import { ConversationItem } from '../../components/ConversationItem'
import { MessageBubble } from '../../components/MessageBubble'
import { useAuthStore } from '../../store/authStore'
import type { ConversationPreview } from '@salonin/types'

const TABS = ['All', 'Unread', 'Archived'] as const
type InboxTab = (typeof TABS)[number]

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState<ConversationPreview | null>(null)
  const [activeTab, setActiveTab] = useState<InboxTab>('All')
  const [search, setSearch] = useState('')
  const {
    conversations,
    isLoading: convLoading,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
  } = useConversations(search.trim())

  const filtered = useMemo(() => {
    if (activeTab === 'All') return conversations.filter((c) => !c.isArchived)
    if (activeTab === 'Unread') return conversations.filter((c) => !c.isArchived && c.unreadCount > 0)
    return conversations.filter((c) => c.isArchived)
  }, [conversations, activeTab])

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0A0A0A', overflow: 'hidden' }}>
      <aside
        style={{
          width: 320,
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

        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1E1E1E' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#1E1E1E',
              borderRadius: 20,
              padding: '8px 12px',
            }}
          >
            <span style={{ color: '#888', fontSize: 16 }}>🔎</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or message"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {search.length > 0 && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1E1E1E' }}>
          {TABS.map((tab) => {
            const isActive = tab === activeTab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#fff' : '#888',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #D85A30' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convLoading
            ? Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)
            : filtered.length === 0
              ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color: '#888',
                    fontSize: 14,
                  }}
                >
                  {activeTab === 'Archived'
                    ? 'No archived chats'
                    : activeTab === 'Unread'
                      ? 'No unread messages'
                      : search.length > 0
                        ? 'No matches found'
                        : 'No conversations yet'}
                </div>
              )
              : filtered.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConv?.id === conv.id}
                  onClick={() => setSelectedConv(conv)}
                  onPin={() => void pinConversation(conv.id, !conv.isPinned)}
                  onArchive={() => void archiveConversation(conv.id, !conv.isArchived)}
                  onMute={() => void muteConversation(conv.id, !conv.isMuted)}
                  onDelete={() => void deleteConversation(conv.id)}
                />
              ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedConv != null ? (
          <ChatPanel
            conversation={selectedConv}
            onPin={() => void pinConversation(selectedConv.id, !selectedConv.isPinned)}
            onArchive={() => void archiveConversation(selectedConv.id, !selectedConv.isArchived)}
            onMute={() => void muteConversation(selectedConv.id, !selectedConv.isMuted)}
            onDelete={() => {
              void deleteConversation(selectedConv.id)
              setSelectedConv(null)
            }}
          />
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

function ChatPanel({
  conversation,
  onPin,
  onArchive,
  onMute,
  onDelete,
}: {
  conversation: ConversationPreview
  onPin?: () => void
  onArchive?: () => void
  onMute?: () => void
  onDelete?: () => void
}) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { messages, isLoading, sendMessage, typingUsers, setTyping } = useMessages(
    conversation.id,
  )
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
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
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: menuOpen ? '#1E1E1E' : 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                backgroundColor: '#1A1A1A',
                border: '1px solid #2E2E2E',
                borderRadius: 8,
                padding: '4px 0',
                zIndex: 10,
                minWidth: 140,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              {[
                { label: conversation.isPinned ? 'Unpin' : 'Pin', action: onPin },
                { label: conversation.isMuted ? 'Unmute' : 'Mute', action: onMute },
                { label: conversation.isArchived ? 'Unarchive' : 'Archive', action: onArchive },
                { label: 'Delete', action: onDelete, danger: true },
              ].map(({ label, action, danger }) =>
                action != null ? (
                  <button
                    key={label}
                    onClick={() => {
                      setMenuOpen(false)
                      action()
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      color: danger ? '#E24B4A' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </button>
                ) : null,
              )}
            </div>
          )}
        </div>
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
          maxLength={2000}
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
