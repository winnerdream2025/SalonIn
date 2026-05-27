import { useCallback } from 'react'
import { authApi } from '@salonin/api-client'
import type { LoginPayload, RegisterPayload } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'
import { useLocationStore } from '../store/locationStore'

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  dmv:     { lat: 38.9072, lng: -77.0369 },
  atlanta: { lat: 33.7490, lng: -84.3880 },
  houston: { lat: 29.7604, lng: -95.3698 },
  miami:   { lat: 25.7617, lng: -80.1918 },
}

function applyDefaultCity(): void {
  if (!useLocationStore.getState().cityId) {
    useLocationStore.getState().setLocation('dmv', CITY_COORDS.dmv.lat, CITY_COORDS.dmv.lng)
  }
}

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const isLoading = useAuthStore((s) => s.isLoading)
  const setTokens = useAuthStore((s) => s.setTokens)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setLoading = useAuthStore((s) => s.setLoading)

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true)
      try {
        const result = await authApi.login(payload)
        setTokens(result)
        applyDefaultCity()
        return result
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setTokens],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setLoading(true)
      try {
        const result = await authApi.register(payload)
        setTokens(result)
        applyDefaultCity()
        return result
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setTokens],
  )

  const logout = useCallback(async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken)
    }
    clearAuth()
  }, [refreshToken, clearAuth])

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  }
}
