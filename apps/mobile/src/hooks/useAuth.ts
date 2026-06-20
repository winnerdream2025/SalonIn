import { useCallback } from 'react'
import { authApi } from '@salonin/api-client'
import type { LoginPayload, RegisterPayload } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

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
