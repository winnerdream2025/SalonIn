import { create } from 'zustand'
import type { User } from '@salonin/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  setTokens: (payload: { accessToken: string; refreshToken: string; user: User }) => void
  clearAuth: () => void
  setLoading: (isLoading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  setTokens: ({ accessToken, refreshToken, user }) =>
    set({ accessToken, refreshToken, user }),
  clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
  setLoading: (isLoading) => set({ isLoading }),
}))
