'use client'

import { useState } from 'react'
import { authApi } from '@salonin/api-client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setIsLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F0F0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, color: '#FFFFFF', margin: 0 }}>
            <span style={{ color: '#FFFFFF' }}>My Salon </span>
            <span style={{ color: '#D85A30' }}>In</span>
          </h1>
          <p style={{ fontSize: 13, color: '#9A9A9A', marginTop: 8 }}>
            Reset your password
          </p>
        </div>

        {sent ? (
          <div style={{
            backgroundColor: '#161616',
            borderRadius: 16,
            padding: 24,
            border: '1px solid rgba(255,255,255,0.10)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              Check your email
            </p>
            <p style={{ color: '#9A9A9A', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              If an account exists for that email, you&apos;ll receive a reset link shortly.
              If not, contact <span style={{ color: '#D85A30' }}>support@mysalon.com</span>.
            </p>
            <Link href="/login" style={{ color: '#D85A30', fontSize: 14, fontWeight: 500 }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#5A5A5A', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  height: 52,
                  backgroundColor: '#1E1E1E',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12,
                  padding: '0 16px',
                  fontSize: 15,
                  color: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#E24B4A', fontSize: 12, marginBottom: 12 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: 52,
                backgroundColor: isLoading ? '#993C1D' : '#D85A30',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 15,
                border: 'none',
                borderRadius: 13,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: 16,
              }}
            >
              {isLoading ? 'Sending…' : 'Send reset link'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#D85A30', fontSize: 14, fontWeight: 500 }}>
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
