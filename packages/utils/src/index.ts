import type { Availability } from '@salonin/types'

// ─── Geo ──────────────────────────────────────────────────────────────────────

export const MILES_TO_METERS = 1609.344

export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS
}

export function metersToMiles(meters: number): number {
  return meters / MILES_TO_METERS
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return '< 0.1 mi'
  return `${miles.toFixed(1)} mi`
}

/**
 * Great-circle distance in miles between two lat/lng points (Haversine).
 * Used client-side to estimate how far a job is from the worker.
 */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613 // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// ─── Worker formatting ────────────────────────────────────────────────────────

export function formatExperience(years: number): string {
  if (years === 0) return 'New pro'
  return `${years} year${years === 1 ? '' : 's'} exp.`
}

// ─── Availability ─────────────────────────────────────────────────────────────

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  NOW:           'Available now',
  TODAY:         'Available today',
  WEEKEND:       'Available this weekend',
  NOT_AVAILABLE: 'Not available',
}

export const AVAILABILITY_COLORS: Record<Availability, string> = {
  NOW:           'text-avail-now',
  TODAY:         'text-avail-today',
  WEEKEND:       'text-avail-weekend',
  NOT_AVAILABLE: 'text-avail-none',
}

// ─── Job utils ────────────────────────────────────────────────────────────────

export function isJobExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) < new Date()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS: ReadonlyArray<[string, string]> = [
  ['#D85A30', '#993C1D'],
  ['#378ADD', '#1A5FA8'],
  ['#1D9E75', '#0D6B4E'],
  ['#EF9F27', '#B87310'],
  ['#9B59B6', '#6C3483'],
  ['#E74C3C', '#A93226'],
]

export function getAvatarGradient(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index] as [string, string]
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Offline'
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) return 'Online'

  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return 'Last seen just now'
  if (diffMins < 60) return `Last seen ${diffMins} min${diffMins === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Last seen ${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return `Last seen ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
