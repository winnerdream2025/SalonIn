'use client'

import { useState } from 'react'
import type { ConversationPreview } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'

interface ConversationItemProps {
  conversation: ConversationPreview
  isSelected: boolean
  onClick: () => void
  onPin?: () => void
  onArchive?: () => void
  onMute?: () => void
  onDelete?: () => void
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

function PinIcon({ color }: { color: string }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l-2 6h-4l-1 2h7v10l-2 2v2h6v-2l-2-2V10h7l-1-2h-4l-2-6h-2z" />
    </svg>
  )
}

function MuteIcon({ color }: { color: string }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path d="M12 4v13.5m-6-4.5h2l4-4v8l-4-4H6V9zm14 6l-4-4m0 4l4-4" />
    </svg>
  )
}

export function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onPin,
  onArchive,
  onMute,
  onDelete,
}: ConversationItemProps) {
  const { otherParticipant, lastMessage, unreadCount, isPinned, isMuted, isArchived } = conversation
  const [avatarBg] = getAvatarGradient(otherParticipant.name)
  const initial = otherParticipant.name[0]?.toUpperCase() ?? '?'
  const [menuOpen, setMenuOpen] = useState(false)

  const lastText =
    lastMessage?.content ??
    (lastMessage?.mediaUrl != null ? 'Photo' : 'Start the conversation')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen((o) => !o)
      }}
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
        position: 'relative',
        outline: 'none',
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isPinned && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(216,90,48,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PinIcon color="#D85A30" />
              </span>
            )}
            {isMuted && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#1E1E1E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MuteIcon color="#888" />
              </span>
            )}
            {lastMessage != null && (
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>
                {formatTime(lastMessage.createdAt)}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: menuOpen ? '#1E1E1E' : 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              ⋮
            </button>
          </span>
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

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
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
            { label: isPinned ? 'Unpin' : 'Pin', action: onPin },
            { label: isMuted ? 'Unmute' : 'Mute', action: onMute },
            { label: isArchived ? 'Unarchive' : 'Archive', action: onArchive },
            { label: 'Delete', action: onDelete, danger: true },
          ].map(({ label, action, danger }) =>
            action != null ? (
              <button
                key={label}
                onClick={(e) => {
                  e.stopPropagation()
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
  )
}
