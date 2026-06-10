import React, { useState, useCallback } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { Input, Button, Text, useTheme } from '@salonin/ui'
import { authApi } from '@salonin/api-client'

export default function ForgotPasswordScreen() {
  const { theme } = useTheme()
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
      <View style={styles.inner}>
        <Text variant="heading" style={styles.title}>Reset password</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link.
        </Text>

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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 32 },
  field: { marginBottom: 16 },
  action: { marginTop: 8, marginBottom: 8 },
})
