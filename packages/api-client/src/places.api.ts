import { api } from './client'

/** One city autocomplete suggestion (no coords — fetch details on selection). */
export interface PlaceSuggestion {
  id: string
  shortName: string
  secondaryText: string
}

/** Normalized place returned by details + reverse geocode. */
export interface ResolvedPlace {
  city: string
  state?: string
  country: string
  countryCode?: string
  lat: number
  lng: number
  formattedAddress: string
  placeId?: string
}

/**
 * Location lookups, proxied through the SalonIn API.
 * The Google key lives only on the server, so it never ships in the app bundle.
 */
export const placesApi = {
  autocomplete: (input: string): Promise<PlaceSuggestion[]> =>
    api
      .get<PlaceSuggestion[]>('/places/autocomplete', { params: { input } })
      .then((r) => r.data),

  details: (placeId: string): Promise<ResolvedPlace | null> =>
    api
      .get<ResolvedPlace | null>('/places/details', { params: { placeId } })
      .then((r) => r.data),

  reverse: (lat: number, lng: number): Promise<ResolvedPlace | null> =>
    api
      .get<ResolvedPlace | null>('/places/reverse', { params: { lat, lng } })
      .then((r) => r.data),
}
