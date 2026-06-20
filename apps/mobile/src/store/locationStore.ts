import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Normalized location model — Google APIs are the source of truth.
 *
 * Three concepts are kept strictly separate:
 *  - Display location   → city / state / country / formattedAddress (human-readable)
 *  - Search coordinates → lat / lng (exact, used for geo-radius queries)
 *  - Place identity     → placeId (Google Place ID, optional)
 *
 * There is intentionally NO cityId / nearest-static-city concept here.
 */
export interface UserLocation {
  placeId?: string
  city: string
  state?: string
  country: string
  lat: number
  lng: number
  /** Search radius in miles. */
  radius: number
  formattedAddress: string
}

/** Params accepted when setting a location. Radius is managed separately. */
export interface SetLocationParams {
  placeId?: string
  city: string
  state?: string
  country: string
  /** ISO 3166-1 alpha-2 country code, used for the flag emoji. */
  countryCode?: string
  flag?: string
  lat: number
  lng: number
  formattedAddress?: string
}

export type RadiusMode = 'suggested' | 'custom'

interface LocationState {
  placeId: string | null
  city: string | null
  state: string | null
  country: string | null
  countryCode: string | null
  flag: string | null
  formattedAddress: string | null
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

function applyLocation(params: SetLocationParams, isGPS: boolean) {
  return {
    placeId: params.placeId ?? null,
    city: params.city,
    state: params.state ?? null,
    country: params.country,
    countryCode: params.countryCode ?? null,
    flag: params.flag ?? null,
    formattedAddress: params.formattedAddress ?? null,
    lat: params.lat,
    lng: params.lng,
    isGPSLocation: isGPS,
  }
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      placeId: null,
      city: null,
      state: null,
      country: null,
      countryCode: null,
      flag: null,
      formattedAddress: null,
      lat: null,
      lng: null,
      isGPSLocation: false,
      radiusMiles: DEFAULT_RADIUS_MILES,
      radiusMode: 'suggested',
      isHydrated: false,
      setLocation: (params) => set(applyLocation(params, false)),
      setGPSLocation: (params) => set(applyLocation(params, true)),
      setRadius: (miles, mode) => set({ radiusMiles: miles, radiusMode: mode }),
      clearLocation: () =>
        set({
          placeId: null,
          city: null,
          state: null,
          country: null,
          countryCode: null,
          flag: null,
          formattedAddress: null,
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Migrate the legacy cityId-based shape (v0/v1) to the normalized model.
      migrate: (persisted: unknown, version: number) => {
        if (version >= 2 || persisted == null || typeof persisted !== 'object') {
          return persisted as LocationState
        }
        const old = persisted as Record<string, unknown>
        return {
          placeId: null,
          // Old `cityName` becomes the display city; cityId is dropped entirely.
          city: (old.cityName as string | null) ?? null,
          state: null,
          country: null,
          countryCode: (old.countryCode as string | null) ?? null,
          flag: (old.flag as string | null) ?? null,
          formattedAddress: (old.cityName as string | null) ?? null,
          lat: (old.lat as number | null) ?? null,
          lng: (old.lng as number | null) ?? null,
          isGPSLocation: Boolean(old.isGPSLocation),
          radiusMiles: (old.radiusMiles as number) ?? DEFAULT_RADIUS_MILES,
          radiusMode: (old.radiusMode as RadiusMode) ?? 'suggested',
        } as unknown as LocationState
      },
      partialize: (state) => ({
        placeId: state.placeId,
        city: state.city,
        state: state.state,
        country: state.country,
        countryCode: state.countryCode,
        flag: state.flag,
        formattedAddress: state.formattedAddress,
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
