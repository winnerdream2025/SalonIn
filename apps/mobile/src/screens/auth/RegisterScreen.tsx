import React, { useState, useCallback } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Linking, Text as RNText } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Input, Button, Text, useTheme, Logo } from '@salonin/ui'
import { useAuth } from '../../hooks/useAuth'
import { parseApiError } from '@salonin/api-client'
import type { Role } from '@salonin/types'

export default function RegisterScreen() {
  const { register, isLoading } = useAuth()
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ role?: string; accountType?: string }>()
  const role = (params.role ?? 'WORKER') as Role
  const accountType = params.accountType as 'CLIENT' | 'PROFESSIONAL' | 'SALON' | undefined
  const isClient = accountType === 'CLIENT'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleRegister = useCallback(async () => {
    setError(undefined)
    try {
      await register({ name, email: email.trim(), password, role, accountType })
      if (isClient) {
        router.replace('/(tabs)')
      } else if (role === 'WORKER') {
        router.replace('/onboarding')
      } else {
        router.replace('/salon-onboarding' as never)
      }
    } catch (e) {
      setError(parseApiError(e))
    }
  }, [register, name, email, password, role, accountType, isClient])

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
            <Text variant="body" style={styles.kicker}>Join the SalonIn collective</Text>
            <Text variant="body" color="secondary" style={styles.heroSubtitle}>
              {isClient
                ? 'Book appointments with top beauty professionals near you.'
                : role === 'WORKER'
                  ? 'Get discovered by salons and showcase your artistry.'
                  : 'Find verified talent and keep your chairs beautifully booked.'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={[styles.roleTag, { backgroundColor: theme.bg.input, borderColor: theme.border.subtle }]}>
            <RNText style={[styles.roleTagText, { color: theme.text.primary }]}>You&apos;re signing up as</RNText>
            <RNText style={[styles.roleTagBadge, { color: theme.brand.primary }]}>
              {isClient ? 'Client' : role === 'WORKER' ? 'Beauty Professional' : 'Salon Owner'}
            </RNText>
          </View>

          <Text variant="heading" style={styles.title}>Create your account</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            A few details to tailor your experience.
          </Text>

          <View style={styles.field}>
            <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          </View>
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
          </View>

          <View style={styles.action}>
            <Button variant="primary" fullWidth loading={isLoading} onPress={handleRegister}>
              Create account
            </Button>
          </View>
          <Button variant="ghost" fullWidth onPress={() => router.back()}>
            Back
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
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 210,
    backgroundColor: 'rgba(216,90,48,0.12)',
  },
  accentPill: {
    position: 'absolute',
    top: 80,
    right: -20,
    width: 190,
    height: 50,
    borderRadius: 32,
    backgroundColor: 'rgba(216,90,48,0.07)',
    transform: [{ rotate: '10deg' }],
  },
  hero: { marginBottom: 18, flexDirection: 'row', alignItems: 'center' },
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
  roleTag: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  roleTagText: { fontSize: 12, fontWeight: '500', letterSpacing: -0.1 },
  roleTagBadge: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  title: { marginBottom: 6 },
  subtitle: { marginBottom: 24 },
  field: { marginBottom: 14 },
  action: { marginTop: 6, marginBottom: 10 },
  footer: { marginTop: 18, paddingHorizontal: 6 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
})
