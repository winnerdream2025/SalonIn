import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { SalonProfileFull } from '@salonin/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getSalon(id: string): Promise<SalonProfileFull | null> {
  try {
    const res = await fetch(`${API_URL}/salons/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json() as Promise<SalonProfileFull>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const salon = await getSalon(params.id)
  if (!salon) return { title: 'Salon not found — My Salon In' }
  return {
    title: `${salon.name} — My Salon In`,
    description: salon.description ?? `${salon.name} is a salon on My Salon In${salon.isHiring ? ' currently hiring' : ''}.`,
  }
}

const EMP_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
  CONTRACT: 'Contract',
  SEASONAL: 'Seasonal',
  APPRENTICESHIP: 'Apprenticeship',
  FREELANCE: 'Freelance',
}

const CITY_LABEL: Record<string, string> = {
  dmv: 'Washington DC / DMV',
  atlanta: 'Atlanta, GA',
  houston: 'Houston, TX',
  miami: 'Miami, FL',
}

export default async function SalonProfilePage({ params }: { params: { id: string } }) {
  const salon = await getSalon(params.id)
  if (!salon) notFound()

  const coverPhoto = salon.photoUrls[0]
  const activeJobs = salon.jobPosts.filter((j) => j.isActive)

  return (
    <div
      style={{
        backgroundColor: 'var(--color-background-primary)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .sp-layout { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
        .sp-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--color-text-tertiary); margin: 0 0 10px 0; }
        .sp-section { margin-bottom: 32px; }
        .sp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .sp-pill { background: var(--color-background-elevated); border: 1px solid var(--color-border); border-radius: 99px; padding: 5px 14px; font-size: 13px; color: var(--color-text-secondary); }
        .sp-job-grid { display: flex; flex-direction: column; gap: 10px; }
        .sp-job-card { display: flex; align-items: center; gap: 14px; padding: 14px; background: var(--color-background-card); border: 1px solid var(--color-border); border-radius: 14px; text-decoration: none; transition: border-color 0.15s; }
        .sp-job-card:hover { border-color: var(--color-brand-border); }
        .sp-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1.5px solid var(--color-border); }
        .sp-avatar-empty { width: 44px; height: 44px; border-radius: 50%; background: var(--color-background-elevated); border: 1.5px solid var(--color-border); flex-shrink: 0; }
        @media (max-width: 560px) { .sp-layout { padding: 20px 16px; } }
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
        <a href="/workers" style={{ color: 'var(--color-text-tertiary)', fontSize: 13, textDecoration: 'none' }}>
          ← Browse pros
        </a>
      </header>

      {/* Cover */}
      <div
        style={{
          height: 160,
          overflow: 'hidden',
          position: 'relative',
          background: coverPhoto
            ? 'var(--color-background-elevated)'
            : 'linear-gradient(135deg, #D85A30 0%, #B84820 100%)',
        }}
      >
        {coverPhoto && (
          <img
            src={coverPhoto}
            alt={salon.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)',
          }}
        />
      </div>

      <div className="sp-layout">
        {/* Salon identity row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -28, marginBottom: 20 }}>
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={salon.name}
              className="sp-avatar"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-background-primary)', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--color-background-elevated)',
                border: '3px solid var(--color-background-primary)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          )}

          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {salon.name}
              </h1>
              {salon.isVerified && (
                <span
                  style={{
                    background: 'rgba(29,158,117,0.15)',
                    color: 'var(--color-avail-now)',
                    borderRadius: 99,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✓ Verified
                </span>
              )}
              {salon.isHiring && (
                <span
                  style={{
                    background: 'var(--color-brand-ghost)',
                    color: 'var(--color-brand)',
                    border: '1px solid var(--color-brand-border)',
                    borderRadius: 99,
                    padding: '2px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Hiring now
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
              {CITY_LABEL[salon.cityId] ?? salon.cityId}
            </p>
          </div>
        </div>

        {salon.description && (
          <div className="sp-section">
            <p className="sp-label">About</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              {salon.description}
            </p>
          </div>
        )}

        {salon.specialties.length > 0 && (
          <div className="sp-section">
            <p className="sp-label">Specialties</p>
            <div className="sp-pills">
              {salon.specialties.map((s) => (
                <span key={s} className="sp-pill">{s}</span>
              ))}
            </div>
          </div>
        )}

        {activeJobs.length > 0 && (
          <div className="sp-section">
            <p className="sp-label">
              Open positions · {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''}
            </p>
            <div className="sp-job-grid">
              {activeJobs.map((job) => {
                const expires = new Date(job.expiresAt)
                const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86_400_000)
                const expiredNow = daysLeft <= 0
                const expiryLabel = expiredNow
                  ? 'Expired'
                  : daysLeft === 1
                  ? 'Expires tomorrow'
                  : `Expires in ${daysLeft} days`

                return (
                  <a key={job.id} href={`/jobs/${job.id}`} className="sp-job-card">
                    {coverPhoto ? (
                      <img src={coverPhoto} alt={salon.name} className="sp-avatar" />
                    ) : (
                      <div className="sp-avatar-empty" />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 3px 0',
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {job.title}
                      </p>
                      <p
                        style={{
                          margin: '0 0 6px 0',
                          fontSize: 12,
                          color: 'var(--color-text-tertiary)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {job.specialty} · {EMP_LABEL[job.type] ?? job.type}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand)' }}>
                          {job.payStructure}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: expiredNow || daysLeft <= 2 ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                          }}
                        >
                          {expiryLabel}
                        </span>
                      </div>
                    </div>

                    {job.isUrgent && !expiredNow && (
                      <span
                        style={{
                          background: 'rgba(239,159,39,0.15)',
                          color: 'var(--color-avail-weekend)',
                          borderRadius: 6,
                          padding: '3px 7px',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          flexShrink: 0,
                          alignSelf: 'flex-start',
                        }}
                      >
                        URGENT
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {activeJobs.length === 0 && (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              background: 'var(--color-background-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
            }}
          >
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, margin: 0 }}>
              No open positions right now.
            </p>
            <a
              href="/jobs"
              style={{ display: 'inline-block', marginTop: 12, color: 'var(--color-brand)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
            >
              View all hiring posts →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
