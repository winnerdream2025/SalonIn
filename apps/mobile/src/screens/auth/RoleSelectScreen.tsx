import React from 'react'
import { View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Button, Text, useTheme } from '@salonin/ui'

export default function RoleSelectScreen() {
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.base }]}>
      <Text variant="heading" style={styles.title}>I am a...</Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Choose how you want to use SalonIn
      </Text>

      <View style={styles.options}>
        <Button
          variant="primary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/(auth)/register', params: { role: 'WORKER' } })
          }
        >
          Beauty Professional
        </Button>
        <View style={styles.spacer} />
        <Button
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/(auth)/register', params: { role: 'SALON' } })
          }
        >
          Salon Owner
        </Button>
      </View>

      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        Back to login
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { marginBottom: 8, textAlign: 'center' },
  subtitle: { marginBottom: 48, textAlign: 'center' },
  options: { marginBottom: 16 },
  spacer: { height: 12 },
})
