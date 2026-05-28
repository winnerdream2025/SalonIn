'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../store/authStore'
import { jobsApi } from '@salonin/api-client'

export function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<'idle' | 'loading' | 'applied' | 'error'>('idle')

  if (user?.role === 'SALON') return null

  if (state === 'applied') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-avail-now-bg)',
          color: 'var(--color-avail-now)',
          borderRadius: 10,
          padding: '11px 24px',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        ✓ Application sent
      </div>
    )
  }

  const handleApply = async () => {
    if (!user) {
      router.push('/register?reason=apply')
      return
    }
    setState('loading')
    try {
      await jobsApi.apply(jobId)
      setState('applied')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <button
      onClick={() => { void handleApply() }}
      disabled={state === 'loading'}
      style={{
        backgroundColor: state === 'error' ? 'var(--color-error)' : 'var(--color-brand)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 10,
        padding: '11px 28px',
        fontSize: 14,
        fontWeight: 700,
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        opacity: state === 'loading' ? 0.7 : 1,
        transition: 'opacity 0.15s, background-color 0.15s',
      }}
    >
      {state === 'loading' ? 'Applying…' : state === 'error' ? 'Try again' : 'Apply now'}
    </button>
  )
}
