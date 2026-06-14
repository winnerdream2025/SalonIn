import React, { useState, useCallback } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Input, Button, Text, useTheme } from '@salonin/ui'
import { authApi } from '@salonin/api-client'

export default function ForgotPasswordScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) return
    setError(undefined)
    setIsLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      router.push('/(auth)/check-email' as never)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [email])

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

        <Text variant="heading" style={styles.title}>Reset password</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={styles.field}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />
          </View>
          <View style={styles.action}>
            <Button variant="primary" fullWidth loading={isLoading} onPress={handleSubmit}>
              Send reset link
            </Button>
          </View>
          <Button variant="ghost" fullWidth onPress={() => router.back()}>
            Back to sign in
          </Button>
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
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: 'rgba(216,90,48,0.12)',
  },
  accentPill: {
    position: 'absolute',
    top: 70,
    left: -10,
    width: 180,
    height: 48,
    borderRadius: 30,
    backgroundColor: 'rgba(216,90,48,0.07)',
    transform: [{ rotate: '-6deg' }],
  },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 20, lineHeight: 20 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 12,
  },
  field: { marginBottom: 8 },
  action: { marginTop: 4, marginBottom: 6 },
})
