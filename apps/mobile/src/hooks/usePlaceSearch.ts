import { useState, useEffect, useRef } from 'react'
import { findNearestCity } from '@salonin/config'
import type { WorldCity } from '@salonin/config'

export interface PlaceResult {
  id: string
  displayName: string
  shortName: string
  lat: number
  lng: number
  cityId: string
  cityRef: WorldCity
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    suburb?: string
    neighbourhood?: string
    county?: string
    state?: string
    country?: string
  }
}

function buildShortName(item: NominatimResult): string {
  const a = item.address ?? {}
  const place = a.city ?? a.town ?? a.village ?? a.suburb ?? a.neighbourhood
  const region = a.state ?? a.county ?? a.country ?? ''
  if (place && region) return `${place}, ${region}`
  if (place) return place
  return item.display_name.split(',').slice(0, 2).join(',').trim()
}

export function usePlaceSearch(query: string, debounceMs = 350) {
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(trimmed)}` +
          `&format=json&limit=6&addressdetails=1`
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'MySalonIn/1.0 (salonin.app)' },
        })
        const data = (await res.json()) as NominatimResult[]
        const mapped: PlaceResult[] = data.map((item) => {
          const lat = parseFloat(item.lat)
          const lng = parseFloat(item.lon)
          const cityRef = findNearestCity(lat, lng)
          return {
            id: String(item.place_id),
            displayName: item.display_name,
            shortName: buildShortName(item),
            lat,
            lng,
            cityId: cityRef.id,
            cityRef,
          }
        })
        setResults(mapped)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query, debounceMs])

  return { results, isLoading }
}
