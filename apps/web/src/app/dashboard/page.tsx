'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

const T = {
  bg: { base: '#0A0A0A', surface: '#111111', elevated: '#1A1A1A', card: '#161616' },
  border: { default: '#1E1E1E', subtle: '#161616' },
  text: { primary: '#FFFFFF', secondary: '#888888', muted: '#444444' },
  brand: { primary: '#D85A30', light: 'rgba(216,90,48,0.12)' },
  avail: { now: '#1D9E75', today: '#378ADD' },
} as const

interface NavCard {
  title: string
  description: string
  href: string
  accent: string
  emoji: string
}

const SALON_CARDS: NavCard[] = [
  {
    title: 'Find Workers',
    description: 'Browse nearby stylists, barbers and beauty professionals.',
    href: '/workers',
    accent: T.brand.primary,
    emoji: '🔍',
  },
  {
    title: 'Hiring Posts',
    description: 'View and manage your open position listings.',
    href: '/jobs',
    accent: T.avail.today,
    emoji: '📋',
  },
  {
    title: 'Messages',
    description: 'Chat with workers and manage conversations.',
    href: '/messages',
    accent: T.avail.now,
    emoji: '💬',
  },
]

const WORKER_CARDS: NavCard[] = [
  {
    title: 'Job Feed',
    description: 'Browse open positions at salons near you.',
    href: '/jobs',
    accent: T.brand.primary,
    emoji: '💼',
  },
  {
    title: 'Messages',
    description: 'Chat with salons that reached out to you.',
    href: '/messages',
    accent: T.avail.now,
    emoji: '💬',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!user) return null

  const cards = user.role === 'SALON' ? SALON_CARDS : WORKER_CARDS
  const roleLabel = user.role === 'SALON' ? 'Salon' : 'Worker'

  return (
    <div style={{ backgroundColor: T.bg.base, minHeight: '100vh' }}>
      {/* Header */}
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
        <span style={{ color: T.brand.primary, fontSize: 18, fontWeight: 800 }}>SalonIn</span>
        <span style={{ color: T.text.muted, fontSize: 13 }}>Dashboard</span>
        <button
          onClick={() => void logout().then(() => router.replace('/login'))}
          style={{
            marginLeft: 'auto',
            backgroundColor: 'transparent',
            border: `1px solid ${T.border.default}`,
            color: T.text.secondary,
            borderRadius: 8,
            padding: '4px 14px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {/* Welcome */}
        <div
          style={{
            backgroundColor: T.bg.surface,
            border: `1px solid ${T.border.default}`,
            borderRadius: 16,
            padding: '28px 32px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: T.brand.light,
              border: `2px solid ${T.brand.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {user.role === 'SALON' ? '💇' : '✂️'}
          </div>
          <div>
            <p style={{ color: T.text.secondary, fontSize: 13, margin: '0 0 4px 0' }}>
              Signed in as {roleLabel}
            </p>
            <h1 style={{ color: T.text.primary, fontSize: 22, fontWeight: 700, margin: 0 }}>
              {user.email}
            </h1>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              backgroundColor: T.brand.light,
              border: `1px solid ${T.brand.primary}`,
              color: T.brand.primary,
              borderRadius: 99,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {roleLabel}
          </div>
        </div>

        {/* Nav cards */}
        <h2
          style={{
            color: T.text.secondary,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 14px 0',
          }}
        >
          Quick access
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {cards.map((card) => (
            <button
              key={card.href}
              onClick={() => router.push(card.href)}
              style={{
                backgroundColor: T.bg.card,
                border: `1px solid ${T.border.default}`,
                borderRadius: 14,
                padding: '24px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = card.accent
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.border.default
              }}
            >
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>
                {card.emoji}
              </span>
              <p
                style={{
                  color: T.text.primary,
                  fontSize: 16,
                  fontWeight: 700,
                  margin: '0 0 6px 0',
                }}
              >
                {card.title}
              </p>
              <p style={{ color: T.text.secondary, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
