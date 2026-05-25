'use client'

import type { ConversationPreview } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'

interface ConversationItemProps {
  conversation: ConversationPreview
  isSelected: boolean
  onClick: () => void
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffH < 48) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const { otherParticipant, lastMessage, unreadCount } = conversation
  const [avatarBg] = getAvatarGradient(otherParticipant.name)
  const initial = otherParticipant.name[0]?.toUpperCase() ?? '?'

  const lastText =
    lastMessage?.content ??
    (lastMessage?.mediaUrl != null ? '📷 Photo' : 'Start the conversation')

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        width: '100%',
        border: 'none',
        borderLeft: isSelected ? '3px solid #D85A30' : '3px solid transparent',
        backgroundColor: isSelected ? '#1A1A1A' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {otherParticipant.photoUrl != null ? (
          <img
            src={otherParticipant.photoUrl}
            alt={otherParticipant.name}
            style={{ width: 44, height: 44, objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{initial}</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: 8,
            }}
          >
            {otherParticipant.name}
          </span>
          {lastMessage != null && (
            <span style={{ color: '#555', fontSize: 11, flexShrink: 0 }}>
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              color: '#888',
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {lastText}
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: '#D85A30',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 10,
                padding: '2px 6px',
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
