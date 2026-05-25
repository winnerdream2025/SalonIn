'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@salonin/types'
import { useAuth } from '../../../hooks/useAuth'

const T = {
  bg: { base: '#0A0A0A', surface: '#111111', input: '#141414' },
  border: { default: '#1E1E1E' },
  text: { primary: '#FFFFFF', secondary: '#999999' },
  brand: { primary: '#D85A30' },
  danger: '#E74C3C',
} as const

const ROLES: { value: Role; label: string }[] = [
  { value: 'WORKER', label: 'Beauty Professional' },
  { value: 'SALON', label: 'Salon Owner' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const [role, setRole] = useState<Role>('WORKER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = useCallback(async () => {
    setError(undefined)
    try {
      await register({ name, email, password, role, cityId: 'dmv' })
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }, [register, name, email, password, role, router])

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
          maxWidth: 480,
          padding: '48px 32px',
          backgroundColor: T.bg.surface,
          borderRadius: 16,
          border: `1px solid ${T.border.default}`,
        }}
      >
        <h1 style={{ color: T.text.primary, fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>
          Create account
        </h1>
        <p style={{ color: T.text.secondary, fontSize: 14, margin: '0 0 32px 0' }}>
          Join SalonIn as a {role === 'WORKER' ? 'beauty professional' : 'salon owner'}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {ROLES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: `1px solid ${role === value ? T.brand.primary : T.border.default}`,
                backgroundColor: role === value ? 'rgba(216,90,48,0.1)' : 'transparent',
                color: role === value ? T.brand.primary : T.text.secondary,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: T.text.secondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: T.text.secondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <label style={{ display: 'block', color: T.text.secondary, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>

        <button
          onClick={() => router.push('/login')}
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
          Back to login
        </button>
      </div>
    </div>
  )
}
