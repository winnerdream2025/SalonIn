'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jobsApi, salonsApi } from '@salonin/api-client'
import { useAuthStore } from '../../../store/authStore'
import type { EmploymentType } from '@salonin/types'

const T = {
  bg: { base: '#0A0A0A', surface: '#111111', elevated: '#1A1A1A' },
  border: { default: '#1E1E1E', strong: 'rgba(255,255,255,0.18)' },
  text: { primary: '#FFFFFF', secondary: '#888888', muted: '#555555' },
  brand: { primary: '#D85A30' },
} as const

const SPECIALTIES = [
  'Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave',
  'Makeup', 'Nails', 'Skincare', 'Waxing', 'Eyebrows', 'Lashes',
]

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME',  label: 'Full-time'  },
  { value: 'PART_TIME',  label: 'Part-time'  },
  { value: 'TEMPORARY',  label: 'Temporary'  },
  { value: 'WEEKEND',    label: 'Weekends'   },
  { value: 'EMERGENCY',  label: 'Emergency'  },
]

const DURATIONS = [
  { days: 7,  label: '7 days'  },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: T.bg.elevated,
  border: `1px solid ${T.border.default}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: T.text.primary,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: T.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

export default function CreateJobPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [cityId, setCityId] = useState<string>('dmv')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]!)
  const [payStructure, setPayStructure] = useState('')
  const [type, setType] = useState<EmploymentType>('FULL_TIME')
  const [isUrgent, setIsUrgent] = useState(false)
  const [durationDays, setDurationDays] = useState(14)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'SALON') { router.replace('/workers'); return }
    salonsApi.getMe()
      .then((salon) => setCityId(salon.cityId))
      .catch(() => { /* keep dmv fallback */ })
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !payStructure.trim()) {
      setError('Title, description, and pay are required.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString()
    try {
      await jobsApi.create({ title, description, specialty, payStructure, type, isUrgent, cityId, expiresAt })
      router.push('/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: T.bg.base, minHeight: '100vh' }}>
      <header
        style={{
          height: 56,
          borderBottom: `1px solid ${T.border.default}`,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 24,
          gap: 16,
        }}
      >
        <button
          onClick={() => router.push('/jobs')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: T.text.secondary,
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 4px',
          }}
          aria-label="Back"
        >
          ←
        </button>
        <span style={{ color: T.brand.primary, fontSize: 18, fontWeight: 800 }}>SalonIn</span>
        <span style={{ color: T.text.secondary, fontSize: 13 }}>Post a Job</span>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ color: T.text.primary, fontSize: 22, fontWeight: 700, marginBottom: 28, marginTop: 0 }}>
          New Job Post
        </h1>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(216,90,48,0.12)',
              border: `1px solid rgba(216,90,48,0.3)`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 20,
              color: T.brand.primary,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Job Title</label>
            <input
              style={inputStyle}
              placeholder="e.g. Experienced Hair Colorist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Describe the role, requirements, and work environment…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Specialty</label>
              <select
                style={inputStyle}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employment Type</label>
              <select
                style={inputStyle}
                value={type}
                onChange={(e) => setType(e.target.value as EmploymentType)}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Pay / Compensation</label>
            <input
              style={inputStyle}
              placeholder="e.g. $25–$35/hr, Commission 50%, Weekly $800+"
              value={payStructure}
              onChange={(e) => setPayStructure(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Post Duration</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  style={{
                    flex: 1,
                    backgroundColor: durationDays === d.days ? 'rgba(216,90,48,0.12)' : T.bg.elevated,
                    border: `1px solid ${durationDays === d.days ? T.brand.primary : T.border.default}`,
                    color: durationDays === d.days ? T.brand.primary : T.text.secondary,
                    borderRadius: 10,
                    padding: '8px 0',
                    fontSize: 13,
                    fontWeight: durationDays === d.days ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsUrgent((v) => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: isUrgent ? '#EF9F27' : T.bg.elevated,
                border: `1px solid ${isUrgent ? '#EF9F27' : T.border.default}`,
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.15s',
              }}
              aria-label="Toggle urgent"
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: isUrgent ? 21 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transition: 'left 0.15s',
                }}
              />
            </button>
            <span style={{ color: isUrgent ? '#EF9F27' : T.text.secondary, fontSize: 13, fontWeight: isUrgent ? 600 : 400 }}>
              {isUrgent ? 'Urgent hire' : 'Mark as urgent'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              backgroundColor: isSubmitting ? 'rgba(216,90,48,0.5)' : T.brand.primary,
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 12,
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Posting…' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  )
}
