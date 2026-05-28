'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../store/authStore'
import { messagesApi } from '@salonin/api-client'

interface MessageButtonProps {
  workerUserId: string
  workerName: string
}

export function MessageButton({ workerUserId, workerName }: MessageButtonProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [isLoading, setIsLoading] = useState(false)

  const firstName = workerName.split(' ')[0] ?? workerName

  const handleClick = async () => {
    if (!user) {
      router.push('/register?reason=message')
      return
    }
    setIsLoading(true)
    try {
      await messagesApi.createConversation(workerUserId)
      router.push('/messages')
    } catch {
      router.push('/messages')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={() => { void handleClick() }}
      disabled={isLoading}
      style={{
        backgroundColor: 'var(--color-brand)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 10,
        padding: '11px 28px',
        fontSize: 14,
        fontWeight: 600,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {isLoading ? 'Opening chat…' : `Message ${firstName}`}
    </button>
  )
}
