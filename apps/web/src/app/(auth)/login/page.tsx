'use client'

import { useState, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'

const T = {
  bg: { base: '#0A0A0A', surface: '#111111', input: '#141414' },
  border: { default: '#1E1E1E' },
  text: { primary: '#FFFFFF', secondary: '#999999' },
  brand: { primary: '#D85A30' },
  danger: '#E74C3C',
} as const

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = useCallback(async () => {
    setError(undefined)
    try {
      await login({ email, password })
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }, [login, email, password, router])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') void handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.bg.base,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '48px 32px',
          backgroundColor: T.bg.surface,
          borderRadius: 16,
          border: `1px solid ${T.border.default}`,
        }}
      >
        <h1
          style={{
            color: T.text.primary,
            fontSize: 24,
            fontWeight: 700,
            margin: '0 0 8px 0',
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: T.text.secondary, fontSize: 14, margin: '0 0 32px 0' }}>
          Sign in to your account
        </p>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              color: T.text.secondary,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            style={{
              width: '100%',
              backgroundColor: T.bg.input,
              border: `1px solid ${T.border.default}`,
              borderRadius: 12,
              padding: '14px 16px',
              color: T.text.primary,
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: error ? 8 : 24 }}>
          <label
            style={{
              display: 'block',
              color: T.text.secondary,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            style={{
              width: '100%',
              backgroundColor: T.bg.input,
              border: `1px solid ${error ? T.danger : T.border.default}`,
              borderRadius: 12,
              padding: '14px 16px',
              color: T.text.primary,
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error !== undefined && (
          <p style={{ color: T.danger, fontSize: 12, margin: '0 0 16px 0' }}>{error}</p>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: T.brand.primary,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            marginBottom: 8,
          }}
        >
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>

        <button
          onClick={() => router.push('/register')}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            color: T.brand.primary,
            border: `1px solid ${T.border.default}`,
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Create an account
        </button>
      </div>
    </div>
  )
}
