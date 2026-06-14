import { create } from 'zustand'

export interface SetLocationParams {
  cityId: string
  lat: number
  lng: number
  cityName?: string
  countryCode?: string
  flag?: string
}

export type RadiusMode = 'suggested' | 'custom'

interface LocationState {
  cityId: string | null
  cityName: string | null
  countryCode: string | null
  flag: string | null
  lat: number | null
  lng: number | null
  isGPSLocation: boolean
  radiusMiles: number
  radiusMode: RadiusMode
  setLocation: (params: SetLocationParams) => void
  setGPSLocation: (params: SetLocationParams) => void
  setRadius: (miles: number, mode: RadiusMode) => void
  clearLocation: () => void
}

const DEFAULT_RADIUS_MILES = 15

export const useLocationStore = create<LocationState>((set) => ({
  cityId: null,
  cityName: null,
  countryCode: null,
  flag: null,
  lat: null,
  lng: null,
  isGPSLocation: false,
  radiusMiles: DEFAULT_RADIUS_MILES,
  radiusMode: 'suggested',
  setLocation: ({ cityId, lat, lng, cityName = null, countryCode = null, flag = null }) =>
    set({ cityId, lat, lng, cityName, countryCode, flag, isGPSLocation: false }),
  setGPSLocation: ({ cityId, lat, lng, cityName = null, countryCode = null, flag = null }) =>
    set({ cityId, lat, lng, cityName, countryCode, flag, isGPSLocation: true }),
  setRadius: (miles, mode) =>
    set({ radiusMiles: miles, radiusMode: mode }),
  clearLocation: () =>
    set({
      cityId: null,
      cityName: null,
      countryCode: null,
      flag: null,
      lat: null,
      lng: null,
      isGPSLocation: false,
      radiusMiles: DEFAULT_RADIUS_MILES,
      radiusMode: 'suggested',
    }),
}))
