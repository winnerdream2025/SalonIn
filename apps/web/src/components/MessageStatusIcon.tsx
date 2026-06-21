'use client'

import type { MessageStatus } from '@salonin/types'

interface MessageStatusIconProps {
  status: MessageStatus
  tint?: string
}

function SingleCheck({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4 10-10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DoubleCheck({ color }: { color: string }) {
  return (
    <svg width={18} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M4 13l4 4 10-10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 13l4 4 10-10" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FailedIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
        fill={color}
      />
    </svg>
  )
}

function SendingIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5.5h-2v5l4.5 2.7.9-1.45L13 11.5V7.5z"
        fill={color}
      />
    </svg>
  )
}

export function MessageStatusIcon({ status, tint }: MessageStatusIconProps) {
  const mutedColor = tint ?? '#888'
  const brandColor = '#D85A30'
  const failedColor = '#E53935'

  switch (status) {
    case 'sending':
      return (
        <span style={{ width: 20, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <SendingIcon color={mutedColor} />
        </span>
      )
    case 'sent':
      return (
        <span style={{ width: 20, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <SingleCheck color={mutedColor} />
        </span>
      )
    case 'delivered':
      return (
        <span style={{ width: 20, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <DoubleCheck color={mutedColor} />
        </span>
      )
    case 'read':
      return (
        <span style={{ width: 20, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <DoubleCheck color={brandColor} />
        </span>
      )
    case 'failed':
      return (
        <span style={{ width: 20, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <FailedIcon color={failedColor} />
        </span>
      )
    default:
      return null
  }
}
