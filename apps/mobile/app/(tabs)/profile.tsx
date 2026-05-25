import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, useTheme } from '@salonin/ui'

export default function ProfileScreen() {
  const { theme } = useTheme()
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={styles.center}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>
          My Profile
        </Text>
        <Text style={{ fontSize: 14, color: theme.text.secondary, marginTop: 8 }}>
          Coming in the next phase
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
})
