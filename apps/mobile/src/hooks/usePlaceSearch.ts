import { useState, useEffect, useRef } from 'react'
import { placesApi } from '@salonin/api-client'

export interface PlaceResult {
  /** Google place_id — used to fetch details on selection */
  id: string
  /** Primary line shown bold: e.g. "Atlanta" */
  shortName: string
  /** Secondary line shown muted: e.g. "Georgia, United States" */
  secondaryText: string
}

export function usePlaceSearch(query: string, debounceMs = 350) {
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Monotonic id so a slow earlier request can't overwrite a newer one.
  const reqIdRef = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const reqId = ++reqIdRef.current
      setIsLoading(true)
      try {
        const suggestions = await placesApi.autocomplete(trimmed)
        if (reqId === reqIdRef.current) setResults(suggestions)
      } catch {
        if (reqId === reqIdRef.current) setResults([])
      } finally {
        if (reqId === reqIdRef.current) setIsLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return { results, isLoading }
}
