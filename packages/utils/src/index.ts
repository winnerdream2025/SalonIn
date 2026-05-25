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
