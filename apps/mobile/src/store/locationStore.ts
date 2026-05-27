import { create } from 'zustand'

interface LocationState {
  cityId: string | null
  lat: number | null
  lng: number | null
  isGPSLocation: boolean
  setLocation: (cityId: string, lat: number, lng: number) => void
  setGPSLocation: (cityId: string, lat: number, lng: number) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>((set) => ({
  cityId: null,
  lat: null,
  lng: null,
  isGPSLocation: false,
  setLocation: (cityId, lat, lng) => set({ cityId, lat, lng, isGPSLocation: false }),
  setGPSLocation: (cityId, lat, lng) => set({ cityId, lat, lng, isGPSLocation: true }),
  clearLocation: () => set({ cityId: null, lat: null, lng: null, isGPSLocation: false }),
}))
