import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Text as RNText,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Input, Button, Text, useTheme, Logo } from '@salonin/ui'
import { useAuth } from '../../hooks/useAuth'
import { parseApiError } from '@salonin/api-client'

export default function LoginScreen() {
  const { login, isLoading } = useAuth()
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleLogin = useCallback(async () => {
    setError(undefined)
    try {
      await login({ email: email.trim(), password })
      setTimeout(() => {
        router.replace((redirect ?? '/(tabs)') as Parameters<typeof router.replace>[0])
      }, 100)
    } catch (e) {
      setError(parseApiError(e))
    }
  }, [login, email, password, redirect])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg.base }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.accentLayer}>
          <View style={styles.accentGlow} />
          <View style={styles.accentPill} />
        </View>

        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Logo size={56} />
          </View>
          <View style={styles.heroText}>
            <Text variant="body" style={styles.kicker}>Beauty careers, curated.</Text>
            <Text variant="body" color="secondary" style={styles.heroSubtitle}>
              Salon owners and artists meet here to book the next iconic look.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>       
          <Text variant="heading" style={styles.title}>Welcome back</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Sign in to your SalonIn space to manage bookings and conversations.
          </Text>

          <View style={styles.field}>
            <Input
              label="Email"
              value={email}
              onChangeText={(t) => setEmail(t.trim())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>
          <View style={styles.field}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error}
            />
            <RNText
              style={[styles.forgotLink, { color: theme.brand.primary }]}
              onPress={() => router.push('/(auth)/forgot-password' as never)}
            >
              Forgot password?
            </RNText>
          </View>

          <View style={styles.action}>
            <Button variant="primary" fullWidth loading={isLoading} onPress={handleLogin}>
              Sign In
            </Button>
          </View>
          <Button variant="ghost" fullWidth onPress={() => router.push('/(auth)/role-select')}>
            Create an account
          </Button>

          <View style={styles.footer}>
            <RNText style={[styles.footerText, { color: theme.text.secondary }]}>
              {'By continuing you agree to our '}
              <RNText
                style={{ color: theme.brand.primary }}
                onPress={() => Linking.openURL('https://salonin-production-77fc.up.railway.app/terms')}
              >
                Terms of Service
              </RNText>
              {' and '}
              <RNText
                style={{ color: theme.brand.primary }}
                onPress={() => Linking.openURL('https://salonin-production-77fc.up.railway.app/privacy')}
              >
                Privacy Policy
              </RNText>
            </RNText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  accentLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, overflow: 'hidden' },
  accentGlow: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 200,
    backgroundColor: 'rgba(216,90,48,0.12)',
  },
  accentPill: {
    position: 'absolute',
    top: 60,
    left: -30,
    width: 180,
    height: 48,
    borderRadius: 32,
    backgroundColor: 'rgba(216,90,48,0.07)',
    transform: [{ rotate: '-8deg' }],
  },
  hero: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  logoWrap: { marginRight: 14 },
  heroText: { flex: 1 },
  kicker: { fontWeight: '600', letterSpacing: -0.2 },
  heroSubtitle: { marginTop: 6, lineHeight: 20 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: { marginBottom: 6 },
  subtitle: { marginBottom: 24 },
  field: { marginBottom: 14 },
  action: { marginTop: 6, marginBottom: 10 },
  footer: { marginTop: 18, paddingHorizontal: 6 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  forgotLink: { fontSize: 12, fontWeight: '500', textAlign: 'right', marginTop: 6 },
})
