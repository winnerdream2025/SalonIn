import React, { useState, useCallback } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Linking, Text as RNText } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Input, Button, Text, useTheme } from '@salonin/ui'
import { useAuth } from '../../hooks/useAuth'
import { useLocationStore } from '../../store/locationStore'
import type { Role } from '@salonin/types'

export default function RegisterScreen() {
  const { register, isLoading } = useAuth()
  const { theme } = useTheme()
  const params = useLocalSearchParams<{ role?: string }>()
  const role = (params.role ?? 'WORKER') as Role

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()

  const handleRegister = useCallback(async () => {
    setError(undefined)
    try {
      await register({ name, email, password, role, cityId: 'dmv' })
      useLocationStore.getState().setLocation('dmv', 38.9072, -77.0369)
      router.replace('/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }, [register, name, email, password, role])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg.base }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="heading" style={styles.title}>Create account</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {role === 'WORKER' ? 'Join as a beauty professional' : 'Register your salon'}
        </Text>

        <View style={styles.field}>
          <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        </View>
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
              onPress={() => Linking.openURL('https://salonin-web-production.up.railway.app/terms')}
            >
              Terms of Service
            </RNText>
            {' and '}
            <RNText
              style={{ color: theme.brand.primary }}
              onPress={() => Linking.openURL('https://salonin-web-production.up.railway.app/privacy')}
            >
              Privacy Policy
            </RNText>
          </RNText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 32 },
  field: { marginBottom: 16 },
  action: { marginTop: 8, marginBottom: 8 },
  footer: { marginTop: 24, paddingHorizontal: 8 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
})
