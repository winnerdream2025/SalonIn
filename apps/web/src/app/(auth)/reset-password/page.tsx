'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return false
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        },
      )

      if (!res.ok) {
        const data = (await res.json()) as { message?: string; error?: string }
        throw new Error(data.message ?? data.error ?? 'Reset failed')
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>!</div>
          <h1 style={styles.title}>Invalid link</h1>
          <p style={styles.subtitle}>This reset link is invalid or has expired.</p>
          <a href="/forgot-password" style={styles.backLink}>
            Request a new link
          </a>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Password reset!</h1>
          <p style={styles.subtitle}>
            Your password has been updated. Redirecting to login…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>S</div>
        <h1 style={styles.title}>Choose a new password</h1>
        <p style={styles.subtitle}>Must be at least 8 characters</p>

        <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
              minLength={8}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.errorMsg}>{error}</div>}

          <button
            type="submit"
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Reset password'}
          </button>
        </form>

        <a href="/login" style={styles.backLink}>
          ← Back to login
        </a>
      </div>
    </div>
  )
}

const coral = '#D85A30'

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#F8F6F3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  logo: {
    width: '56px',
    height: '56px',
    background: coral,
    borderRadius: '14px',
    fontSize: '28px',
    fontWeight: 900,
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#1A1A1A',
    margin: '0 0 8px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6B6B6B',
    margin: '0 0 32px',
    lineHeight: '22px',
  },
  form: { textAlign: 'left' },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#1A1A1A',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    height: '48px',
    padding: '0 14px',
    fontSize: '15px',
    background: '#F8F6F3',
    border: '1px solid #E8E4DF',
    borderRadius: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorMsg: {
    background: 'rgba(226,75,74,0.08)',
    color: '#E24B4A',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  button: {
    width: '100%',
    height: '48px',
    background: coral,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '22px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    letterSpacing: '-0.2px',
  },
  backLink: {
    display: 'block',
    marginTop: '24px',
    fontSize: '14px',
    color: coral,
    textDecoration: 'none',
  },
  successIcon: {
    width: '56px',
    height: '56px',
    background: 'rgba(29,158,117,0.1)',
    borderRadius: '50%',
    fontSize: '24px',
    color: '#1D9E75',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  errorIcon: {
    width: '56px',
    height: '56px',
    background: 'rgba(226,75,74,0.1)',
    borderRadius: '50%',
    fontSize: '24px',
    color: '#E24B4A',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
