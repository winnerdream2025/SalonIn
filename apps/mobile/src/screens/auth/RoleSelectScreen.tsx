import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Button, Text, useTheme } from '@salonin/ui'

export default function RoleSelectScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.base,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <View style={styles.accentLayer}>
        <View style={styles.accentGlow} />
        <View style={styles.accentPill} />
      </View>

      <Text variant="heading" style={styles.title}>How do you beautify?</Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Pick the path that fits you today. You can always switch roles later.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
        <Text variant="body" style={styles.cardTitle}>For creators</Text>
        <Text variant="body" color="secondary" style={styles.cardSubtitle}>
          Showcase your artistry, get discovered by salons, and secure bookings.
        </Text>
        <Button
          variant="primary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/(auth)/register', params: { role: 'WORKER' } })
          }
        >
          I&apos;m a Beauty Professional
        </Button>
      </View>

      <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
        <Text variant="body" style={styles.cardTitle}>For salons</Text>
        <Text variant="body" color="secondary" style={styles.cardSubtitle}>
          Build your roster with vetted talent and keep your chairs beautifully booked.
        </Text>
        <Button
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/(auth)/register', params: { role: 'SALON' } })
          }
        >
          I run a Salon
        </Button>
      </View>

      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        Back to login
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  accentLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, overflow: 'hidden' },
  accentGlow: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 230,
    height: 230,
    borderRadius: 200,
    backgroundColor: 'rgba(216,90,48,0.12)',
  },
  accentPill: {
    position: 'absolute',
    top: 90,
    left: -20,
    width: 200,
    height: 50,
    borderRadius: 34,
    backgroundColor: 'rgba(216,90,48,0.08)',
    transform: [{ rotate: '-6deg' }],
  },
  title: { marginBottom: 8, textAlign: 'center' },
  subtitle: { marginBottom: 26, textAlign: 'center', lineHeight: 20 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontWeight: '700', letterSpacing: -0.1 },
  cardSubtitle: { lineHeight: 20 },
})
