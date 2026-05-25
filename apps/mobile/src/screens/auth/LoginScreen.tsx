import React, { useState, useCallback } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { Input, Button, Text, useTheme } from '@salonin/ui'
import { useAuth } from '../../hooks/useAuth'

export default function LoginScreen() {
  const { login, isLoading } = useAuth()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleLogin = useCallback(async () => {
    setError(undefined)
    try {
      await login({ email, password })
      router.replace('/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }, [login, email, password])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg.base }]}
    >
      <View style={styles.inner}>
        <Text variant="heading" style={styles.title}>Welcome back</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Sign in to your account
        </Text>

        <View style={styles.field}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
          <Button variant="primary" fullWidth loading={isLoading} onPress={handleLogin}>
            Sign In
          </Button>
        </View>
        <Button variant="ghost" fullWidth onPress={() => router.push('/(auth)/role-select')}>
          Create an account
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
