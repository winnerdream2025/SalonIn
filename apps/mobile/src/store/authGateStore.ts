import { create } from 'zustand'

interface AuthGateState {
  visible: boolean
  redirectAfterAuth: string
  message: string
  show: (redirectAfterAuth?: string, message?: string) => void
  hide: () => void
}

export const useAuthGateStore = create<AuthGateState>((set) => ({
  visible: false,
  redirectAfterAuth: '/(tabs)',
  message: '',
  show: (redirectAfterAuth = '/(tabs)', message = '') =>
    set({ visible: true, redirectAfterAuth, message }),
  hide: () => set({ visible: false }),
}))
