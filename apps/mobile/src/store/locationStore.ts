import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface SetLocationParams {
  cityId?: string
  lat: number
  lng: number
  cityName?: string
  countryCode?: string
  flag?: string
}

export type RadiusMode = 'suggested' | 'custom'

interface LocationState {
  /** @deprecated Use lat/lng instead. Kept for backward compatibility. */
  cityId: string | null
  cityName: string | null
  countryCode: string | null
  flag: string | null
  lat: number | null
  lng: number | null
  isGPSLocation: boolean
  radiusMiles: number
  radiusMode: RadiusMode
  isHydrated: boolean
  setLocation: (params: SetLocationParams) => void
  setGPSLocation: (params: SetLocationParams) => void
  setRadius: (miles: number, mode: RadiusMode) => void
  clearLocation: () => void
  setHydrated: () => void
}

const DEFAULT_RADIUS_MILES = 15

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      cityId: null,
      cityName: null,
      countryCode: null,
      flag: null,
      lat: null,
      lng: null,
      isGPSLocation: false,
      radiusMiles: DEFAULT_RADIUS_MILES,
      radiusMode: 'suggested',
      isHydrated: false,
      setLocation: ({ cityId, lat, lng, cityName, countryCode, flag }) =>
        set({
          cityId: cityId ?? null,
          lat,
          lng,
          cityName: cityName ?? null,
          countryCode: countryCode ?? null,
          flag: flag ?? null,
          isGPSLocation: false,
        }),
      setGPSLocation: ({ cityId, lat, lng, cityName, countryCode, flag }) =>
        set({
          cityId: cityId ?? null,
          lat,
          lng,
          cityName: cityName ?? null,
          countryCode: countryCode ?? null,
          flag: flag ?? null,
          isGPSLocation: true,
        }),
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
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'salonin-location',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cityId: state.cityId,
        cityName: state.cityName,
        countryCode: state.countryCode,
        flag: state.flag,
        lat: state.lat,
        lng: state.lng,
        isGPSLocation: state.isGPSLocation,
        radiusMiles: state.radiusMiles,
        radiusMode: state.radiusMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)
