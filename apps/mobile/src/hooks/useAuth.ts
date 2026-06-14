import { useCallback } from 'react'
import { authApi } from '@salonin/api-client'
import type { LoginPayload, RegisterPayload } from '@salonin/api-client'
import { getCityById } from '@salonin/config'
import { useAuthStore } from '../store/authStore'
import { useLocationStore } from '../store/locationStore'

function applyDefaultCity(): void {
  const store = useLocationStore.getState()
  if (!store.cityId) {
    const city = getCityById('dmv')!
    store.setLocation({ cityId: city.id, lat: city.lat, lng: city.lng, cityName: city.name, countryCode: city.countryCode, flag: city.flag })
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
