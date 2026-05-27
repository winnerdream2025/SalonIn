import { api, setAuthTokens, clearAuthTokens } from './client'
import type { User } from '@salonin/types'

export interface RegisterPayload {
  email: string
  password: string
  role: string
  name: string
  cityId: string
  phone?: string | undefined
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: User
}

export interface TokenResult {
  accessToken: string
  refreshToken: string
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResult> => {
    const { data } = await api.post<AuthResult>('/auth/register', payload)
    setAuthTokens(data)
    return data
  },

  login: async (payload: LoginPayload): Promise<AuthResult> => {
    const { data } = await api.post<AuthResult>('/auth/login', payload)
    setAuthTokens(data)
    return data
  },

  refresh: async (refreshToken: string): Promise<TokenResult> => {
    const { data } = await api.post<TokenResult>('/auth/refresh', { refreshToken })
    setAuthTokens(data)
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken })
    clearAuthTokens()
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account')
    clearAuthTokens()
  },
}
