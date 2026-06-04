import React, { useEffect } from 'react'
import { AppState, View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { configureClient } from '@salonin/api-client'
import { useNotifications } from '../src/hooks/useNotifications'
import { useLocationStore } from '../src/store/locationStore'
import { useAuthStore } from '../src/store/authStore'
import { Logo } from '@salonin/ui'

// Sentry temporarily disabled due to iOS 26.5 SDK compatibility issues
// import * as Sentry from '@sentry/react-native'
// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV ?? 'development',
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
//   enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
// })

if (!useLocationStore.getState().cityId) {
  useLocationStore.getState().setLocation('dmv', 38.9072, -77.0369)
}

const prefix = Linking.createURL('/')

export const linkingConfig = {
  prefixes: [prefix, 'https://salonin.com'],
  config: {
    screens: {
      'worker/[id]': 'worker/:id',
      'salon/[id]': 'salon/:id',
      'jobs/[id]': 'jobs/:id',
      'chat/[id]': 'chat/:id',
      'chat-requests': 'chat-requests',
    },
  },
}

function RootLayout() {
  const isLoading = useAuthStore((s) => s.isLoading)
  const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken)
  const accessToken = useAuthStore((s) => s.accessToken)

  useNotifications()

  useEffect(() => {
    void refreshAccessToken()
  }, [refreshAccessToken])

  useEffect(() => {
    configureClient({
      baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
    })
  }, [accessToken])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const { cityId, lat, lng } = useLocationStore.getState()
        if (cityId && lat !== null && lng !== null) {
          useLocationStore.getState().setLocation(cityId, lat, lng)
        }
      }
    })
    return () => sub.remove()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Logo size={100} />
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>Salonin</Text>
        <Text style={{ color: '#555555', fontSize: 13, letterSpacing: 0.2 }}>Beauty workforce marketplace</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default RootLayout
