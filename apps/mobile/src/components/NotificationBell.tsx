import React from 'react'
import { View, Pressable, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@salonin/ui'

interface NotificationBellProps {
  hasUnread?: boolean
  size?: number
}

export function NotificationBell({ hasUnread = false, size = 24 }: NotificationBellProps) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={() => {
        Alert.alert('Notifications', 'Notifications coming soon')
      }}
      style={styles.container}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="notifications-outline" size={size} color={theme.text.primary} />
      {hasUnread && (
        <View style={[styles.badge, { backgroundColor: '#E24B4A' }]} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
