'use client'

import { getAvatarGradient, formatDistance, formatExperience } from '@salonin/utils'
import type { WorkerCardData } from '@salonin/types'

const AVAIL = {
  NOW: { label: 'Available now', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)' },
  TODAY: { label: 'Today', color: '#378ADD', bg: 'rgba(55,138,221,0.15)' },
  WEEKEND: { label: 'This weekend', color: '#EF9F27', bg: 'rgba(239,159,39,0.15)' },
  NOT_AVAILABLE: { label: 'Not available', color: '#555555', bg: 'rgba(85,85,85,0.15)' },
} as const

type AvailKey = keyof typeof AVAIL

export function WorkerCard({ worker, onClick }: { worker: WorkerCardData; onClick: () => void }) {
  const [bgColor] = getAvatarGradient(worker.name)
  const initials = worker.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const specialty = worker.specialties[0] ?? ''
  const sub = [specialty, formatExperience(worker.experienceYears)].filter(Boolean).join(' · ')
  const avail = AVAIL[worker.availability as AvailKey] ?? AVAIL.NOT_AVAILABLE

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 12,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: bgColor,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {worker.photoUrl ? (
          <img
            src={worker.photoUrl}
            alt={worker.name}
            style={{ width: 44, height: 44, objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>{initials}</span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {worker.name}
        </span>
        <span
          style={{
            color: '#888888',
            fontSize: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: avail.bg,
              borderRadius: 99,
              padding: '2px 8px 2px 6px',
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: avail.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: avail.color, fontSize: 10, fontWeight: 600 }}>
              {avail.label}
            </span>
          </div>
          {worker.isVerified && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#1D9E75',
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>

      {worker.distanceMiles !== null && (
        <span style={{ color: '#555555', fontSize: 9, flexShrink: 0 }}>
          {formatDistance(worker.distanceMiles)}
        </span>
      )}
    </button>
  )
}

export function WorkerCardSkeleton() {
  const shimmer = '#2A2A2A'
  return (
    <div
      style={{
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 12,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: shimmer, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ width: 120, height: 12, borderRadius: 6, backgroundColor: shimmer }} />
        <div style={{ width: 80, height: 10, borderRadius: 5, backgroundColor: shimmer }} />
        <div style={{ width: 90, height: 18, borderRadius: 9, backgroundColor: shimmer }} />
      </div>
    </div>
  )
}
