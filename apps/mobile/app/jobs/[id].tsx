import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, Button, useTheme } from '@salonin/ui'

export default function JobDetailScreen() {
  const { theme } = useTheme()
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={styles.center}>
        <Text variant="heading">Job Detail</Text>
        <Text variant="body" color="secondary" style={styles.sub}>Coming in the next phase</Text>
        <Button variant="ghost" onPress={() => router.back()}>Go back</Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sub: { textAlign: 'center' },
})
