import React, { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { configureClient } from '@salonin/api-client'
import { useNotifications } from '../src/hooks/useNotifications'
import { useAuthStore } from '../src/store/authStore'
import { Logo } from '@salonin/ui'
import { StoriesProvider } from '../src/contexts/StoriesContext'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { AuthGateModal } from '../src/components/AuthGateModal'

// Sentry temporarily disabled due to iOS 26.5 SDK compatibility issues
// import * as Sentry from '@sentry/react-native'
// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV ?? 'development',
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
//   enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
// })


const prefix = Linking.createURL('/')

export const linkingConfig = {
  prefixes: [prefix, 'https://mysalonin.com'],
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
  const user = useAuthStore((s) => s.user)
  const segments = useSegments()
  const router = useRouter()

  useNotifications()

  useEffect(() => {
    void refreshAccessToken()
  }, [refreshAccessToken])

  useEffect(() => {
    configureClient({
      baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'
    // Only redirect logged-in users away from auth screens.
    // Unauthenticated users can freely browse Discovery and Jobs.
    if (user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, isLoading, segments, router])

  return (
    <StoriesProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      <AuthGateModal />
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Logo size={100} />
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>My Salon In</Text>
          <Text style={{ color: '#555555', fontSize: 13, letterSpacing: 0.2 }}>Beauty workforce marketplace</Text>
        </View>
      )}
    </StoriesProvider>
  )
}

// ── Stripe guard ─────────────────────────────────────────────────────────────
// @stripe/stripe-react-native calls TurboModuleRegistry.getEnforcing at load
// time and crashes in Expo Go (StripeSdk not in native binary). Use try/catch
// require so the app degrades gracefully; a dev-client build has the native module.
type StripeProviderProps = { publishableKey: string; merchantIdentifier?: string; children: React.ReactNode }
let StripeProvider: React.ComponentType<StripeProviderProps>
try {
  StripeProvider = (require('@stripe/stripe-react-native') as { StripeProvider: React.ComponentType<StripeProviderProps> }).StripeProvider
} catch {
  StripeProvider = ({ children }: StripeProviderProps) => React.createElement(React.Fragment, null, children)
}

const ENV_STRIPE_KEY = (process.env as Record<string, string | undefined>)['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? ''
const isPlaceholder = !ENV_STRIPE_KEY || ENV_STRIPE_KEY.startsWith('pk_test_placeholder')

export default function RootLayoutWithBoundary() {
  const [stripeKey, setStripeKey] = useState(isPlaceholder ? '' : ENV_STRIPE_KEY)

  useEffect(() => {
    if (!isPlaceholder) return
    const apiUrl = (process.env as Record<string, string | undefined>)['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'
    fetch(`${apiUrl}/booking-profiles/stripe-key`)
      .then((r) => r.json())
      .then((body: { data?: { stripePublishableKey?: string } }) => {
        const key = body.data?.stripePublishableKey
        if (key && key.startsWith('pk_')) setStripeKey(key)
      })
      .catch(() => { /* silent — payment sheet will warn if key missing */ })
  }, [])

  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.com.mysalonin">
        <RootLayout />
      </StripeProvider>
    </ErrorBoundary>
  )
}
