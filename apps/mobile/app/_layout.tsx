import React, { useEffect } from 'react'
import { AppState } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { configureClient } from '@salonin/api-client'
import { useNotifications } from '../src/hooks/useNotifications'
import { useLocationStore } from '../src/store/locationStore'

// Sentry temporarily disabled due to iOS 26.5 SDK compatibility issues
// import * as Sentry from '@sentry/react-native'
// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV ?? 'development',
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
//   enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
// })

configureClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
})

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
  useNotifications()

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

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default RootLayout
