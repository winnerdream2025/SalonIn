import { create } from 'zustand'

export interface SetLocationParams {
  cityId: string
  lat: number
  lng: number
  cityName?: string
  countryCode?: string
  flag?: string
}

interface LocationState {
  cityId: string | null
  cityName: string | null
  countryCode: string | null
  flag: string | null
  lat: number | null
  lng: number | null
  isGPSLocation: boolean
  setLocation: (params: SetLocationParams) => void
  setGPSLocation: (params: SetLocationParams) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>((set) => ({
  cityId: null,
  cityName: null,
  countryCode: null,
  flag: null,
  lat: null,
  lng: null,
  isGPSLocation: false,
  setLocation: ({ cityId, lat, lng, cityName = null, countryCode = null, flag = null }) =>
    set({ cityId, lat, lng, cityName, countryCode, flag, isGPSLocation: false }),
  setGPSLocation: ({ cityId, lat, lng, cityName = null, countryCode = null, flag = null }) =>
    set({ cityId, lat, lng, cityName, countryCode, flag, isGPSLocation: true }),
  clearLocation: () =>
    set({ cityId: null, cityName: null, countryCode: null, flag: null, lat: null, lng: null, isGPSLocation: false }),
}))
