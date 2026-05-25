import { create } from 'zustand'

interface LocationState {
  cityId: string | null
  lat: number | null
  lng: number | null
  setLocation: (cityId: string, lat: number, lng: number) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>((set) => ({
  cityId: null,
  lat: null,
  lng: null,
  setLocation: (cityId, lat, lng) => set({ cityId, lat, lng }),
  clearLocation: () => set({ cityId: null, lat: null, lng: null }),
}))
