'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WorkerCard, WorkerCardSkeleton } from '../../components/WorkerCard'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'

const T = {
  bg: { base: '#0A0A0A', surface: '#111111', elevated: '#1A1A1A' },
  border: { default: '#1E1E1E' },
  text: { primary: '#FFFFFF', secondary: '#888888', muted: '#555555' },
  brand: { primary: '#D85A30' },
} as const

const SPECIALTIES = [
  'Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave',
]

const CITY_PRESETS = [
  { cityId: 'dmv', label: 'Washington DC / DMV', lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
]

const SKELETON_COUNT = 9

export default function WorkersPage() {
  const router = useRouter()
  const cityId = useLocationStore((s) => s.cityId)
  const currentLat = useLocationStore((s) => s.lat)
  const currentLng = useLocationStore((s) => s.lng)
  const setLocation = useLocationStore((s) => s.setLocation)

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()

  const { workers, isLoading, isLoadingMore, hasMore, error, refresh, loadMore } =
    useNearbyWorkers({ specialty: selectedSpecialty })

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          void loadMore()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => { observer.disconnect() }
  }, [hasMore, isLoadingMore, loadMore])

  const handleToggleSpecialty = useCallback((s: string) => {
    setSelectedSpecialty((prev) => (prev === s ? undefined : s))
  }, [])

  const handleWorkerClick = useCallback(
    (id: string) => { router.push(`/workers/${id}`) },
    [router],
  )

  const locationLabel = CITY_PRESETS.find((c) => c.cityId === cityId)?.label ?? cityId ?? 'Select city'
  const isLocationSet = cityId != null && currentLat != null && currentLng != null

  return (
    <>
      <style>{`
        .wd-layout { display: flex; gap: 24px; max-width: 1280px; margin: 0 auto; padding: 24px 16px; align-items: flex-start; }
        .wd-sidebar { width: 220px; flex-shrink: 0; }
        .wd-main { flex: 1; min-width: 0; }
        .wd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
        @media (max-width: 767px) {
          .wd-layout { flex-direction: column; }
          .wd-sidebar { width: 100%; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        }
      `}</style>

      <div style={{ backgroundColor: T.bg.base, minHeight: '100vh' }}>
        {/* Top bar */}
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border.default}`,
            display: 'flex',
            alignItems: 'center',
            paddingInline: 24,
            gap: 24,
          }}
        >
          <span style={{ color: T.brand.primary, fontSize: 18, fontWeight: 800 }}>SalonIn</span>
          <span style={{ color: T.text.secondary, fontSize: 13 }}>Discover Talent</span>
          {isLocationSet && (
            <button
              onClick={refresh}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                border: `1px solid ${T.border.default}`,
                color: T.text.secondary,
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          )}
        </header>

        <div className="wd-layout">
          {/* Sidebar */}
          <aside className="wd-sidebar">
            {/* Location section */}
            <div style={{ marginBottom: 24 }}>
              <p
                style={{
                  color: T.text.secondary,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 10px 0',
                }}
              >
                Location
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CITY_PRESETS.map((city) => {
                  const active = cityId === city.cityId
                  return (
                    <button
                      key={city.cityId}
                      onClick={() => setLocation(city.cityId, city.lat, city.lng)}
                      style={{
                        backgroundColor: active ? 'rgba(216,90,48,0.12)' : T.bg.elevated,
                        border: `1px solid ${active ? T.brand.primary : T.border.default}`,
                        color: active ? T.brand.primary : T.text.primary,
                        borderRadius: 10,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      {city.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Specialty section */}
            <div>
              <p
                style={{
                  color: T.text.secondary,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 10px 0',
                }}
              >
                Specialty
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SPECIALTIES.map((s) => {
                  const active = selectedSpecialty === s
                  return (
                    <button
                      key={s}
                      onClick={() => handleToggleSpecialty(s)}
                      style={{
                        backgroundColor: active ? T.brand.primary : T.bg.elevated,
                        border: `1px solid ${active ? T.brand.primary : T.border.default}`,
                        color: active ? '#FFFFFF' : T.text.secondary,
                        borderRadius: 99,
                        padding: '5px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="wd-main">
            {/* Heading */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ color: T.text.primary, fontSize: 20, fontWeight: 700, margin: 0 }}>
                {isLocationSet ? `Workers near ${locationLabel}` : 'Discover Workers'}
              </h1>
              {workers.length > 0 && (
                <span style={{ color: T.text.muted, fontSize: 13 }}>
                  {workers.length} result{workers.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Grid / states */}
            {!isLocationSet ? (
              <div
                style={{
                  textAlign: 'center',
                  paddingTop: 64,
                  color: T.text.secondary,
                  fontSize: 14,
                }}
              >
                Select a city from the sidebar to find nearby workers.
              </div>
            ) : isLoading ? (
              <div className="wd-grid">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <WorkerCardSkeleton key={i} />
                ))}
              </div>
            ) : error != null ? (
              <div style={{ textAlign: 'center', paddingTop: 48 }}>
                <p style={{ color: T.text.secondary, fontSize: 14, marginBottom: 16 }}>
                  {error.message}
                </p>
                <button
                  onClick={refresh}
                  style={{
                    backgroundColor: T.brand.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
            ) : workers.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 48 }}>
                <p style={{ color: T.text.secondary, fontSize: 14 }}>
                  No workers found nearby.
                </p>
                <p style={{ color: T.text.muted, fontSize: 12 }}>
                  Try clearing the specialty filter or choosing a different city.
                </p>
              </div>
            ) : (
              <>
                <div className="wd-grid">
                  {workers.map((worker) => (
                    <WorkerCard
                      key={worker.id}
                      worker={worker}
                      onClick={() => handleWorkerClick(worker.id)}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: 1, marginTop: 24 }} />

                {isLoadingMore && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: T.text.muted, fontSize: 13 }}>
                    Loading more…
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
