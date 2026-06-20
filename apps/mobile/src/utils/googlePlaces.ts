import { placesApi } from '@salonin/api-client'
import type { ResolvedPlace } from '@salonin/api-client'

// Location lookups go through the SalonIn API, which holds the Google key
// server-side. No API key is bundled into the app anymore.
export type { ResolvedPlace }

/**
 * Fetch full normalized place details for a Google place_id.
 * Called only when the user selects an autocomplete result.
 */
export async function fetchPlaceDetails(placeId: string): Promise<ResolvedPlace | null> {
  try {
    return await placesApi.details(placeId)
  } catch {
    return null
  }
}

/**
 * Reverse-geocode a lat/lng to a normalized place.
 * Returns null when the request fails (caller shows a fallback label).
 */
export async function reverseGeocodeWithGoogle(
  lat: number,
  lng: number,
): Promise<ResolvedPlace | null> {
  try {
    return await placesApi.reverse(lat, lng)
  } catch {
    return null
  }
}

/** Build a short display label, e.g. "Syracuse, NY" or "Lagos, Nigeria". */
export function formatPlaceLabel(
  place: Pick<ResolvedPlace, 'city' | 'state' | 'country' | 'countryCode'>,
): string {
  const tail = place.countryCode === 'US' ? place.state : place.state ?? place.country
  if (place.city && tail && place.city !== tail) return `${place.city}, ${tail}`
  return place.city || place.country || 'Selected area'
}
