import React, { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Switch } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import * as SecureStore from 'expo-secure-store'

const PREFS_KEY = 'salonin_notif_prefs'

interface NotifPrefs {
  bookingReminders: boolean
  newMessages: boolean
  statusUpdates: boolean
  marketing: boolean
}

const DEFAULTS: NotifPrefs = {
  bookingReminders: true,
  newMessages: true,
  statusUpdates: true,
  marketing: false,
}

const PREFS_CONFIG: { key: keyof NotifPrefs; label: string; description: string; icon: string }[] = [
  { key: 'bookingReminders', label: 'Booking Reminders', description: 'Get reminded before upcoming appointments', icon: 'alarm-outline' },
  { key: 'newMessages', label: 'New Messages', description: 'Notifications for new chat messages', icon: 'chatbubble-outline' },
  { key: 'statusUpdates', label: 'Booking Updates', description: 'Confirmations, cancellations, and changes', icon: 'calendar-outline' },
  { key: 'marketing', label: 'Promotions', description: 'Deals, tips, and platform announcements', icon: 'megaphone-outline' },
]

export default function NotificationPrefsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS)

  useEffect(() => {
    SecureStore.getItemAsync(PREFS_KEY)
      .then((raw) => { if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) }) })
      .catch(() => {})
  }, [])

  const toggle = useCallback((key: keyof NotifPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      void SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32, gap: 10 }}>
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>PUSH NOTIFICATIONS</Text>
        {PREFS_CONFIG.map((item, i) => (
          <View
            key={item.key}
            style={[
              styles.row,
              { backgroundColor: theme.bg.card, borderColor: theme.border.subtle },
              i > 0 && styles.rowBorder,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
              <Ionicons name={item.icon as never} size={18} color="#D85A30" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>{item.description}</Text>
            </View>
            <Switch
              value={prefs[item.key]}
              onValueChange={(v) => toggle(item.key, v)}
              trackColor={{ true: '#D85A30', false: theme.border.default }}
              thumbColor="#fff"
            />
          </View>
        ))}
        <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 8, lineHeight: 18 }}>
          These preferences are saved on this device. System notification permissions are managed in your device Settings.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  rowBorder: { marginTop: 0 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
})
