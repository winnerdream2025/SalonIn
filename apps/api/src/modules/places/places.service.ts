import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '../../redis/redis.service'

/** One autocomplete suggestion sent to the client (no coords — those come from details). */
export interface PlaceSuggestion {
  id: string
  shortName: string
  secondaryText: string
}

/** Normalized place returned for details + reverse-geocode. */
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

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

const AUTOCOMPLETE_TTL = 600 // 10 min — text predictions change slowly
const RESOLVE_TTL = 86_400 // 1 day — a place_id / point maps to a stable place

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name)
  private readonly key: string

  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    // Server-side key only. NOT EXPO_PUBLIC — it never ships to the client bundle.
    this.key = config.get<string>('GOOGLE_PLACES_KEY') ?? ''
    if (!this.key) {
      this.logger.warn('GOOGLE_PLACES_KEY is not set — places endpoints will return empty results.')
    }
  }

  /** City autocomplete predictions for a search box. */
  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    if (!this.key) return []
    const cacheKey = `places:auto:${input.toLowerCase()}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as PlaceSuggestion[]

    const params = new URLSearchParams({
      input,
      types: '(cities)',
      key: this.key,
    })
    const data = await this.fetchJson<{
      status: string
      predictions?: Array<{
        place_id: string
        structured_formatting: { main_text: string; secondary_text: string }
      }>
    }>(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`)

    if (!data || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) return []

    const suggestions: PlaceSuggestion[] = (data.predictions ?? []).slice(0, 8).map((p) => ({
      id: p.place_id,
      shortName: p.structured_formatting.main_text,
      secondaryText: p.structured_formatting.secondary_text,
    }))

    await this.redis.set(cacheKey, JSON.stringify(suggestions), 'EX', AUTOCOMPLETE_TTL)
    return suggestions
  }

  /** Full normalized details for a place_id — called when the user selects a suggestion. */
  async details(placeId: string): Promise<ResolvedPlace | null> {
    if (!this.key) return null
    const cacheKey = `places:details:${placeId}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as ResolvedPlace

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'geometry,address_components,formatted_address,place_id',
      key: this.key,
    })
    const data = await this.fetchJson<{
      status: string
      result?: {
        place_id?: string
        formatted_address?: string
        geometry?: { location?: { lat: number; lng: number } }
        address_components?: AddressComponent[]
      }
    }>(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`)

    const loc = data?.result?.geometry?.location
    if (!data || data.status !== 'OK' || !data.result || !loc) return null

    const resolved = this.normalize(
      data.result.address_components ?? [],
      loc.lat,
      loc.lng,
      data.result.formatted_address,
      data.result.place_id ?? placeId,
    )
    if (resolved) await this.redis.set(cacheKey, JSON.stringify(resolved), 'EX', RESOLVE_TTL)
    return resolved
  }

  /** Reverse-geocode a lat/lng to a normalized place (GPS fixes, map drags). */
  async reverse(lat: number, lng: number): Promise<ResolvedPlace | null> {
    if (!this.key) return null
    // ~110m bucket so nearby users share a cache entry.
    const cacheKey = `places:rev:${lat.toFixed(3)}:${lng.toFixed(3)}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as ResolvedPlace

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      result_type: 'locality|administrative_area_level_1|country',
      key: this.key,
    })
    const data = await this.fetchJson<{
      status: string
      results?: Array<{
        place_id?: string
        formatted_address?: string
        address_components: AddressComponent[]
      }>
    }>(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`)

    const first = data?.results?.[0]
    if (!data || data.status !== 'OK' || !first) return null

    const resolved = this.normalize(
      first.address_components,
      lat,
      lng,
      first.formatted_address,
      first.place_id,
    )
    if (resolved) await this.redis.set(cacheKey, JSON.stringify(resolved), 'EX', RESOLVE_TTL)
    return resolved
  }

  /**
   * Turn Google address components into a normalized place.
   * City resolution falls back through locality → town → sublocality → admin areas,
   * so we never mislabel a point as a far-off static city.
   */
  private normalize(
    components: AddressComponent[],
    lat: number,
    lng: number,
    formattedAddress: string | undefined,
    placeId: string | undefined,
  ): ResolvedPlace | null {
    const locality = components.find(
      (c) =>
        c.types.includes('locality') ||
        c.types.includes('postal_town') ||
        c.types.includes('sublocality_level_1') ||
        c.types.includes('administrative_area_level_3') ||
        c.types.includes('administrative_area_level_2'),
    )
    const adminArea = components.find((c) => c.types.includes('administrative_area_level_1'))
    const country = components.find((c) => c.types.includes('country'))

    const city = locality?.long_name ?? adminArea?.long_name ?? country?.long_name ?? ''
    if (!city) return null

    return {
      city,
      state: adminArea?.short_name,
      country: country?.long_name ?? '',
      countryCode: country?.short_name,
      lat,
      lng,
      formattedAddress: formattedAddress ?? city,
      placeId,
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url)
      return (await res.json()) as T
    } catch (err) {
      this.logger.error(`Google request failed: ${err instanceof Error ? err.message : 'unknown'}`)
      return null
    }
  }
}
