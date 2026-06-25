/**
 * Maps SalonIn provider identifiers to external booking tenant slugs.
 *
 * Flow: providerId (WorkerProfile.id | SalonProfile.id)
 *    → GET /booking-profiles/provider (our SalonIn API)
 *    → ProviderBookingProfile.tenantSlug
 *    → external booking API calls
 */
import { bookingProfileApi } from '@salonin/api-client'
import type { BookingProviderType, ProviderBookingProfile } from '@salonin/types'

interface ProviderProfile {
  tenantSlug: string
  providerEmail: string | null
  providerPassword: string | null
}

/** In-session cache to avoid redundant lookups within the same app session. */
const profileCache = new Map<string, ProviderProfile | null>()

/**
 * Resolve the full provider profile (tenantSlug + credentials) for a SalonIn provider.
 * Returns null if no booking profile has been set up for this provider.
 */
export async function resolveProviderProfile(
  providerId: string,
  providerType: BookingProviderType,
): Promise<ProviderProfile | null> {
  const cacheKey = `${providerType}:${providerId}`

  if (profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey) ?? null
  }

  const profile: ProviderBookingProfile | null =
    await bookingProfileApi.getByProvider(providerId, providerType)

  const result = profile?.isActive
    ? {
        tenantSlug: profile.tenantSlug,
        providerEmail: profile.providerEmail ?? null,
        providerPassword: profile.providerPassword ?? null,
      }
    : null
  profileCache.set(cacheKey, result)
  return result
}

/** @deprecated Use resolveProviderProfile instead */
export async function resolveTenantSlug(
  providerId: string,
  providerType: BookingProviderType,
): Promise<string | null> {
  const p = await resolveProviderProfile(providerId, providerType)
  return p?.tenantSlug ?? null
}

/** Invalidate the cache for a specific provider (call after profile updates). */
export function invalidateSlugCache(
  providerId: string,
  providerType: BookingProviderType,
): void {
  profileCache.delete(`${providerType}:${providerId}`)
}
