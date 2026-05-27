import React from 'react'
import { Stack } from 'expo-router'
import * as Sentry from '@sentry/react-native'
import { configureClient } from '@salonin/api-client'
import { useNotifications } from '../src/hooks/useNotifications'
import { useLocationStore } from '../src/store/locationStore'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
})

configureClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
})

if (!useLocationStore.getState().cityId) {
  useLocationStore.getState().setLocation('dmv', 38.9072, -77.0369)
}

function RootLayout() {
  useNotifications()
  return <Stack screenOptions={{ headerShown: false }} />
}

export default Sentry.wrap(RootLayout)
