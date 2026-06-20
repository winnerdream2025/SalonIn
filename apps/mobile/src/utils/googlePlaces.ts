const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

export interface PlaceDetails {
  lat: number
  lng: number
  countryCode?: string
}

/**
 * Fetch lat/lng + country code for a Google Places place_id.
 * Called only when the user selects a result (not during autocomplete typing).
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!PLACES_KEY) return null
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'geometry,address_components',
    key: PLACES_KEY,
  })
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    )
    const data = (await res.json()) as {
      status: string
      result?: {
        geometry?: { location?: { lat: number; lng: number } }
        address_components?: Array<{ types: string[]; short_name: string }>
      }
    }
    if (data.status !== 'OK') return null
    const loc = data.result?.geometry?.location
    if (!loc) return null
    const countryComp = (data.result?.address_components ?? []).find((c) =>
      c.types.includes('country'),
    )
    return { lat: loc.lat, lng: loc.lng, countryCode: countryComp?.short_name }
  } catch {
    return null
  }
}

// ── Reverse geocode ──────────────────────────────────────────────────────────

export interface ReverseGeocodeResult {
  /** Human-readable label, e.g. "Atlanta, GA" */
  name: string
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  countryCode: string
}

/**
 * Reverse-geocode a lat/lng to a city label using Google Geocoding API.
 * Falls back gracefully when the key is missing or the request fails.
 */
export async function reverseGeocodeWithGoogle(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  if (!PLACES_KEY) return null
  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      result_type: 'locality|administrative_area_level_1',
      key: PLACES_KEY,
    })
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    )
    const data = (await res.json()) as {
      status: string
      results: Array<{
        address_components: Array<{
          long_name: string
          short_name: string
          types: string[]
        }>
      }>
    }
    if (data.status !== 'OK' || !data.results?.length) return null

    const components = data.results[0]!.address_components

    const locality = components.find(
      (c) =>
        c.types.includes('locality') ||
        c.types.includes('sublocality_level_1') ||
        c.types.includes('administrative_area_level_3'),
    )
    const adminArea = components.find((c) =>
      c.types.includes('administrative_area_level_1'),
    )
    const country = components.find((c) => c.types.includes('country'))

    const localityName = locality?.long_name
    const adminShort = adminArea?.short_name
    const countryCode = country?.short_name

    if (!countryCode) return null

    const name =
      localityName && adminShort && localityName !== adminShort
        ? `${localityName}, ${adminShort}`
        : localityName ?? adminShort ?? ''

    return name ? { name, countryCode } : null
  } catch {
    return null
  }
}

export { PLACES_KEY }
