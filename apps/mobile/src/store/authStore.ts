import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { authApi } from '@salonin/api-client'
import type { User } from '@salonin/types'

const REFRESH_KEY = 'salonin_refresh_token'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  setTokens: (payload: { accessToken: string; refreshToken: string; user: User }) => void
  clearAuth: () => void
  setLoading: (isLoading: boolean) => void
  refreshAccessToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  setTokens: ({ accessToken, refreshToken, user }) => {
    void SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
    set({ accessToken, refreshToken, user })
  },
  clearAuth: () => {
    void SecureStore.deleteItemAsync(REFRESH_KEY)
    set({ user: null, accessToken: null, refreshToken: null })
  },
  setLoading: (isLoading) => set({ isLoading }),
  refreshAccessToken: async () => {
    try {
      const stored = await SecureStore.getItemAsync(REFRESH_KEY)
      if (!stored) {
        set({ isLoading: false })
        return false
      }
      const result = await authApi.refresh(stored)
      void SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken)
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isLoading: false,
      })
      return true
    } catch {
      void SecureStore.deleteItemAsync(REFRESH_KEY)
      set({ isLoading: false })
      return false
    }
  },
}))
