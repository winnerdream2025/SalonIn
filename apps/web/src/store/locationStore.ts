import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WebSetLocationParams {
  cityId?: string
  lat: number
  lng: number
  cityName?: string
}

interface LocationState {
  /** @deprecated Use lat/lng instead */
  cityId: string | null
  cityName: string | null
  lat: number | null
  lng: number | null
  radiusMiles: number
  setLocation: (params: WebSetLocationParams) => void
  clearLocation: () => void
}

const DEFAULT_RADIUS_MILES = 50

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      cityId: null,
      cityName: null,
      lat: null,
      lng: null,
      radiusMiles: DEFAULT_RADIUS_MILES,
      setLocation: ({ cityId, lat, lng, cityName }) =>
        set({ cityId: cityId ?? null, lat, lng, cityName: cityName ?? null }),
      clearLocation: () =>
        set({ cityId: null, cityName: null, lat: null, lng: null, radiusMiles: DEFAULT_RADIUS_MILES }),
    }),
    {
      name: 'salonin-web-location',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cityId: state.cityId,
        cityName: state.cityName,
        lat: state.lat,
        lng: state.lng,
        radiusMiles: state.radiusMiles,
      }),
    },
  ),
)
