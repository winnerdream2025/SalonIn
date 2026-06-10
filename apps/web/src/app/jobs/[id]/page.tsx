import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { JobPostDetail } from '@salonin/types'
import { ApplyButton } from '../../../components/ApplyButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getJob(id: string): Promise<JobPostDetail | null> {
  try {
    const res = await fetch(`${API_URL}/jobs/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json() as Promise<JobPostDetail>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id)
  if (!job) return { title: 'Job not found — Salonin' }
  return {
    title: `${job.title} at ${job.salon.name} — Salonin`,
    description: `${job.specialty} · ${job.payStructure} · ${job.salon.name}`,
  }
}

const EMP_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
}

const CITY_LABEL: Record<string, string> = {
  dmv: 'Washington DC / DMV',
  atlanta: 'Atlanta, GA',
  houston: 'Houston, TX',
  miami: 'Miami, FL',
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id)
  if (!job) notFound()

  const expires = new Date(job.expiresAt)
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86_400_000)
  const isExpired = daysLeft <= 0
  const expiryLabel = isExpired
    ? 'Expired'
    : daysLeft === 1
    ? 'Expires tomorrow'
    : `Expires in ${daysLeft} days`

  const salonPhoto = job.salon.photoUrls[0] ?? null
  const cityLabel = CITY_LABEL[job.cityId] ?? job.cityId
  const typeLabel = EMP_LABEL[job.type] ?? job.type

  return (
    <div
      style={{
        backgroundColor: 'var(--color-background-primary)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .jd-layout { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
        .jd-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--color-text-tertiary); margin: 0 0 10px 0; }
        .jd-section { margin-bottom: 28px; }
        .jd-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .jd-pill { background: var(--color-background-elevated); border: 1px solid var(--color-border); border-radius: 99px; padding: 5px 14px; font-size: 13px; color: var(--color-text-secondary); }
        .jd-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .jd-info-cell { background: var(--color-background-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; }
        @media (max-width: 480px) { .jd-layout { padding: 20px 16px; } .jd-info-grid { grid-template-columns: 1fr; } }
      `}</style>

      <header
        style={{
          height: 56,
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 24,
          gap: 20,
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--color-background-primary)',
          zIndex: 10,
        }}
      >
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>Salon</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-brand)' }}>in</span>
        </a>
        <a href="/jobs" style={{ color: 'var(--color-text-tertiary)', fontSize: 13, textDecoration: 'none' }}>
          ← Hiring posts
        </a>
      </header>

      <div className="jd-layout">
        {/* Salon header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'var(--color-background-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            marginBottom: 24,
          }}
        >
          {salonPhoto ? (
            <img
              src={salonPhoto}
              alt={job.salon.name}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: '1.5px solid var(--color-border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--color-background-elevated)',
                border: '1.5px solid var(--color-border)',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {job.salon.name}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {cityLabel}
            </p>
          </div>
          <a
            href={`/salons/${job.salonId}`}
            style={{
              fontSize: 12,
              color: 'var(--color-brand)',
              textDecoration: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            View salon
          </a>
        </div>

        {/* Title + badges */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: 'var(--color-text-primary)',
                margin: 0,
                lineHeight: 1.2,
                flex: 1,
              }}
            >
              {job.title}
            </h1>
            {job.isUrgent && !isExpired && (
              <span
                style={{
                  background: 'rgba(239,159,39,0.15)',
                  color: 'var(--color-avail-weekend)',
                  border: '1px solid rgba(239,159,39,0.3)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                  marginTop: 4,
                }}
              >
                URGENT
              </span>
            )}
          </div>

          <div className="jd-pills">
            <span className="jd-pill">{job.specialty}</span>
            <span
              className="jd-pill"
              style={{ color: 'var(--color-avail-today)', borderColor: 'rgba(55,138,221,0.3)', background: 'rgba(55,138,221,0.1)' }}
            >
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="jd-info-grid" style={{ marginBottom: 24 }}>
          <div className="jd-info-cell">
            <p className="jd-label">Pay</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-brand)' }}>{job.payStructure}</p>
          </div>
          <div className="jd-info-cell">
            <p className="jd-label">Type</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{typeLabel}</p>
          </div>
          <div className="jd-info-cell">
            <p className="jd-label">Location</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{cityLabel}</p>
          </div>
          <div className="jd-info-cell">
            <p className="jd-label">Applicants</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {job.applicantCount}
            </p>
          </div>
        </div>

        {/* Apply CTA */}
        {!isExpired && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '16px 20px',
              background: 'var(--color-background-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              marginBottom: 28,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: isExpired || daysLeft <= 2 ? 'var(--color-error)' : 'var(--color-text-tertiary)' }}>
              {expiryLabel}
            </p>
            <ApplyButton jobId={job.id} />
          </div>
        )}

        {isExpired && (
          <div
            style={{
              padding: '14px 20px',
              background: 'rgba(226,75,74,0.08)',
              border: '1px solid rgba(226,75,74,0.25)',
              borderRadius: 14,
              marginBottom: 28,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-error)', fontWeight: 600 }}>
              This position has expired and is no longer accepting applications.
            </p>
          </div>
        )}

        {/* Description */}
        <div className="jd-section">
          <p className="jd-label">About this role</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {job.description}
          </p>
        </div>

        {job.salon.description && (
          <div className="jd-section">
            <p className="jd-label">About the salon</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {job.salon.description}
            </p>
          </div>
        )}

        {/* Footer links */}
        <div
          style={{
            paddingTop: 20,
            borderTop: '1px solid var(--color-border-subtle)',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <a href={`/salons/${job.salonId}`} style={{ color: 'var(--color-brand)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
            View {job.salon.name} →
          </a>
          <a href="/jobs" style={{ color: 'var(--color-text-tertiary)', fontSize: 13, textDecoration: 'none' }}>
            All hiring posts
          </a>
        </div>
      </div>
    </div>
  )
}
