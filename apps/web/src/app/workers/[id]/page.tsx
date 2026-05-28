import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkerProfileFull } from '@salonin/types'
import { MessageButton } from '../../../components/MessageButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getWorker(id: string): Promise<WorkerProfileFull | null> {
  try {
    const res = await fetch(`${API_URL}/workers/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json() as Promise<WorkerProfileFull>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const worker = await getWorker(params.id)
  if (!worker) return { title: 'Worker not found — Salonin' }
  const specialty = worker.specialties[0] ?? 'Beauty Pro'
  return {
    title: `${worker.name} · ${specialty} — Salonin`,
    description: worker.bio ?? `${worker.name} is a beauty professional on Salonin.`,
  }
}

const AVAIL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NOW:           { label: 'Available now',   color: 'var(--color-avail-now)',     bg: 'var(--color-avail-now-bg)' },
  TODAY:         { label: 'Available today', color: 'var(--color-avail-today)',   bg: 'var(--color-avail-today-bg)' },
  WEEKEND:       { label: 'Weekends',        color: 'var(--color-avail-weekend)', bg: 'var(--color-avail-weekend-bg)' },
  NOT_AVAILABLE: { label: 'Not available',   color: 'var(--color-avail-none)',    bg: 'var(--color-avail-none-bg)' },
}

export default async function WorkerProfilePage({ params }: { params: { id: string } }) {
  const worker = await getWorker(params.id)
  if (!worker) notFound()

  const avail = AVAIL_CONFIG[worker.availability] ?? AVAIL_CONFIG.NOT_AVAILABLE!
  const expLabel = worker.experienceYears === 0 ? 'New pro' : `${worker.experienceYears} yr${worker.experienceYears !== 1 ? 's' : ''} exp`

  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        .wp-layout { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
        .wp-hero { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
        .wp-avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--color-border); }
        .wp-avatar-empty { width: 96px; height: 96px; border-radius: 50%; background: var(--color-background-elevated); border: 1.5px solid var(--color-border); flex-shrink: 0; }
        .wp-section { margin-bottom: 28px; }
        .wp-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--color-text-tertiary); margin: 0 0 10px 0; }
        .wp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .wp-pill { background: var(--color-background-elevated); border: 1px solid var(--color-border); border-radius: 99px; padding: 5px 14px; font-size: 13px; color: var(--color-text-secondary); }
        .wp-portfolio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
        @media (max-width: 540px) { .wp-portfolio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .wp-hero { flex-direction: column; } }
        .wp-portfolio-cell { aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: var(--color-background-elevated); position: relative; }
        .wp-portfolio-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .wp-video-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.28); }
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
          ← Professionals
        </a>
      </header>

      <div className="wp-layout">
        {/* Hero */}
        <div className="wp-hero">
          {worker.photoUrl ? (
            <img src={worker.photoUrl} alt={worker.name} className="wp-avatar" />
          ) : (
            <div className="wp-avatar-empty" />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {worker.name}
              </h1>
              {worker.isVerified && (
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
            </div>

            <p style={{ margin: '0 0 10px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {worker.specialties[0] ?? 'Beauty Professional'}
              {' · '}
              {expLabel}
              {' · '}
              {worker.cityId.toUpperCase()}
            </p>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: avail.bg,
                borderRadius: 99,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: avail.color,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: avail.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {avail.label}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <MessageButton workerUserId={worker.userId} workerName={worker.name} />
        </div>

        {worker.bio && (
          <div className="wp-section">
            <p className="wp-label">About</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              {worker.bio}
            </p>
          </div>
        )}

        {worker.specialties.length > 0 && (
          <div className="wp-section">
            <p className="wp-label">Specialties</p>
            <div className="wp-pills">
              {worker.specialties.map((s) => (
                <span key={s} className="wp-pill">{s}</span>
              ))}
            </div>
          </div>
        )}

        {worker.employmentTypes.length > 0 && (
          <div className="wp-section">
            <p className="wp-label">Open to</p>
            <div className="wp-pills">
              {worker.employmentTypes.map((t) => (
                <span key={t} className="wp-pill" style={{ textTransform: 'capitalize' }}>
                  {t.replace('_', ' ').toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {worker.languages.length > 0 && (
          <div className="wp-section">
            <p className="wp-label">Languages</p>
            <div className="wp-pills">
              {worker.languages.map((l) => (
                <span key={l} className="wp-pill">{l}</span>
              ))}
            </div>
          </div>
        )}

        {worker.portfolioItems.length > 0 && (
          <div className="wp-section">
            <p className="wp-label">Portfolio · {worker.portfolioItems.length} item{worker.portfolioItems.length !== 1 ? 's' : ''}</p>
            <div className="wp-portfolio-grid">
              {worker.portfolioItems.map((item) => (
                <div key={item.id} className="wp-portfolio-cell">
                  {item.type === 'VIDEO' ? (
                    <>
                      <div style={{ width: '100%', height: '100%', background: 'var(--color-background-elevated)' }} />
                      <div className="wp-video-overlay">
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="13" height="15" viewBox="0 0 13 15" fill="var(--color-brand)">
                            <path d="M1 1l11 6.5-11 6.5V1z" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={item.mediaUrl} alt={item.caption ?? 'Portfolio'} loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
