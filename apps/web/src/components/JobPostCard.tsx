'use client'

import { isJobExpired, getAvatarGradient } from '@salonin/utils'
import type { JobPostCardData } from '@salonin/types'

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
}

export function JobPostCard({ job, onClick }: { job: JobPostCardData; onClick: () => void }) {
  const [bgColor] = getAvatarGradient(job.salonName)
  const expired = isJobExpired(job.expiresAt)
  const typeLabel = TYPE_LABEL[job.type] ?? job.type

  const expiryStr = expired
    ? 'Expired'
    : `Exp ${new Date(job.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

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
        {job.salonPhotoUrl ? (
          <img
            src={job.salonPhotoUrl}
            alt={job.salonName}
            style={{ width: 44, height: 44, objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
            {job.salonName[0]?.toUpperCase() ?? 'S'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {job.title}
        </span>
        <span
          style={{
            color: '#888888',
            fontSize: 10,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {job.salonName}
        </span>
        <span style={{ color: '#666666', fontSize: 10 }}>
          {job.specialty} · {typeLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#D85A30', fontSize: 10, fontWeight: 600 }}>{job.payStructure}</span>
          <span style={{ color: expired ? '#E74C3C' : '#555555', fontSize: 9 }}>{expiryStr}</span>
        </div>
      </div>

      {job.isUrgent && !expired && (
        <div
          style={{
            backgroundColor: 'rgba(239,159,39,0.15)',
            borderRadius: 6,
            padding: '3px 6px',
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ color: '#EF9F27', fontSize: 8, fontWeight: 800, letterSpacing: '0.5px' }}>
            URGENT
          </span>
        </div>
      )}
    </button>
  )
}

export function JobPostCardSkeleton() {
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
        <div style={{ width: 140, height: 12, borderRadius: 6, backgroundColor: shimmer }} />
        <div style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: shimmer }} />
        <div style={{ width: 110, height: 10, borderRadius: 5, backgroundColor: shimmer }} />
        <div style={{ width: 130, height: 10, borderRadius: 5, backgroundColor: shimmer }} />
      </div>
    </div>
  )
}
