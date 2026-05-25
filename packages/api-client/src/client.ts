import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

export interface ClientConfig {
  baseURL: string
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let _accessToken: string | null = null
let _refreshToken: string | null = null
let _isRefreshing = false
const _pendingRequests: Array<(token: string | null) => void> = []

function drainPending(token: string | null): void {
  _pendingRequests.splice(0).forEach((cb) => cb(token))
}

export function configureClient(config: ClientConfig): void {
  api.defaults.baseURL = config.baseURL
}

export function setAuthTokens(tokens: { accessToken: string; refreshToken: string }): void {
  _accessToken = tokens.accessToken
  _refreshToken = tokens.refreshToken
}

export function clearAuthTokens(): void {
  _accessToken = null
  _refreshToken = null
}

export function getAccessToken(): string | null {
  return _accessToken
}

export const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (err: unknown) => {
    if (!axios.isAxiosError(err)) return Promise.reject(err)

    const originalRequest = err.config as RetryConfig | undefined
    if (!originalRequest) return Promise.reject(err)

    if (err.response?.status === 401 && !originalRequest._retry && _refreshToken) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _pendingRequests.push((token) => {
            if (!token) { reject(err); return }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      _isRefreshing = true

      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken: _refreshToken },
        )
        setAuthTokens(data)
        drainPending(data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (_retryErr: unknown) {
        clearAuthTokens()
        drainPending(null)
        return Promise.reject(err)
      } finally {
        _isRefreshing = false
      }
    }

    return Promise.reject(err)
  },
)
