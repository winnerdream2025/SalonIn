import { useState, useEffect, useRef } from 'react'
import { PLACES_KEY } from '../utils/googlePlaces'

export interface PlaceResult {
  /** Google place_id — used to fetch details on selection */
  id: string
  /** Primary line shown bold: e.g. "Atlanta" */
  shortName: string
  /** Secondary line shown muted: e.g. "Georgia, United States" */
  secondaryText: string
}

interface AutocompletePrediction {
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface AutocompleteResponse {
  status: string
  predictions: AutocompletePrediction[]
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
        const params = new URLSearchParams({
          input: trimmed,
          types: '(cities)',
          key: PLACES_KEY,
        })
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
          { signal: controller.signal },
        )
        const data = (await res.json()) as AutocompleteResponse

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          setResults([])
          return
        }

        const mapped: PlaceResult[] = (data.predictions ?? []).slice(0, 8).map((p) => ({
          id: p.place_id,
          shortName: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text,
        }))

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
