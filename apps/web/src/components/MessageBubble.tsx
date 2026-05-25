'use client'

import type { Message } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'

interface MessageBubbleProps {
  message: Message
  isSelf: boolean
  showAvatar?: boolean
  senderName?: string
  senderPhotoUrl?: string | null
}

export function MessageBubble({
  message,
  isSelf,
  showAvatar = false,
  senderName,
  senderPhotoUrl,
}: MessageBubbleProps) {
  const time = new Date(message.createdAt as unknown as string).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const [avatarBg] = getAvatarGradient(senderName ?? '?')
  const initial = (senderName ?? '?')[0]?.toUpperCase() ?? '?'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isSelf ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 6,
        margin: '2px 0',
        padding: '0 16px',
      }}
    >
      {!isSelf && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar ? (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: avatarBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {senderPhotoUrl != null ? (
                <img
                  src={senderPhotoUrl}
                  alt={senderName ?? ''}
                  style={{ width: 28, height: 28, objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{initial}</span>
              )}
            </div>
          ) : (
            <div style={{ width: 28, height: 28 }} />
          )}
        </div>
      )}

      <div
        style={{
          maxWidth: '75%',
          backgroundColor: isSelf ? '#D85A30' : '#1E1E1E',
          borderRadius: 16,
          borderBottomRightRadius: isSelf ? 4 : 16,
          borderBottomLeftRadius: isSelf ? 16 : 4,
          padding: '8px 12px',
        }}
      >
        {message.mediaUrl != null && (
          <img
            src={message.mediaUrl}
            alt="attachment"
            style={{
              width: 200,
              height: 160,
              objectFit: 'cover',
              borderRadius: 10,
              marginBottom: 4,
              display: 'block',
            }}
          />
        )}
        {message.content != null && message.content.length > 0 && (
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.5, margin: 0, padding: 0 }}>
            {message.content}
          </p>
        )}
        <span
          style={{
            fontSize: 10,
            color: isSelf ? 'rgba(255,255,255,0.6)' : '#555',
            display: 'block',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {time}
        </span>
      </div>
    </div>
  )
}
