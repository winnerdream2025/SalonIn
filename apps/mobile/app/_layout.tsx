import React from 'react'
import { Stack } from 'expo-router'
import * as Sentry from '@sentry/react-native'
import { configureClient } from '@salonin/api-client'
import { useNotifications } from '../src/hooks/useNotifications'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
})

configureClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
})

function RootLayout() {
  useNotifications()
  return <Stack screenOptions={{ headerShown: false }} />
}

export default Sentry.wrap(RootLayout)
