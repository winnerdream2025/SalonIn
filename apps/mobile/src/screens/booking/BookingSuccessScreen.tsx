import React, { useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'

function formatDateDisplay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime12(t: string): string {
  if (!t || t.includes('AM') || t.includes('PM')) return t ?? ''
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

export default function BookingSuccessScreen() {
  const { theme } = useTheme()
  const { bottom, top } = useSafeAreaInsets()

  const { confirmationCode, serviceName, providerName, date, startTime, price, currency } =
    useLocalSearchParams<{
      confirmationCode: string
      serviceName: string
      providerName: string
      date: string
      startTime: string
      price: string
      currency: string
    }>()

  const parsedPrice = parseFloat(price ?? '0')

  const handleViewBookings = useCallback(() => {
    router.dismissAll()
    router.push('/(tabs)/jobs' as never)
  }, [])

  const handleDone = useCallback(() => {
    router.dismissAll()
  }, [])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      <View style={styles.body}>
        {/* Success icon */}
        <View style={[styles.iconCircle, { backgroundColor: '#1D9E7520' }]}>
          <Ionicons name="checkmark-circle" size={72} color="#1D9E75" />
        </View>

        <Text style={[styles.heading, { color: theme.text.primary }]}>Booking Confirmed!</Text>
        <Text style={[styles.sub, { color: theme.text.secondary }]}>
          Your appointment has been submitted.{'\n'}The provider will confirm shortly.
        </Text>

        {/* Details card */}
        <View style={[styles.card, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          {confirmationCode ? (
            <View style={[styles.codeRow, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.codeLabel, { color: theme.text.tertiary }]}>CONFIRMATION</Text>
              <Text style={[styles.codeValue, { color: '#D85A30' }]}>{confirmationCode}</Text>
            </View>
          ) : null}

          {serviceName ? (
            <View style={styles.detailRow}>
              <Ionicons name="cut-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.detailText, { color: theme.text.primary }]} numberOfLines={1}>
                {serviceName}
              </Text>
            </View>
          ) : null}

          {providerName ? (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.detailText, { color: theme.text.primary }]} numberOfLines={1}>
                {providerName}
              </Text>
            </View>
          ) : null}

          {date ? (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.detailText, { color: theme.text.primary }]}>
                {formatDateDisplay(date)}
              </Text>
            </View>
          ) : null}

          {startTime ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.detailText, { color: theme.text.primary }]}>
                {formatTime12(startTime)}
              </Text>
            </View>
          ) : null}

          {parsedPrice > 0 ? (
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={16} color={theme.text.tertiary} />
              <Text style={[styles.detailText, { color: theme.text.primary }]}>
                {formatPrice(parsedPrice, currency ?? 'USD')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleViewBookings}
          activeOpacity={0.8}
          style={[styles.primaryBtn, { backgroundColor: '#D85A30' }]}
        >
          <Text style={styles.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDone} activeOpacity={0.7} style={styles.ghostBtn}>
          <Text style={[styles.ghostBtnText, { color: theme.text.secondary }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  codeRow: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  codeLabel: { fontSize: 11, letterSpacing: 1.2, fontWeight: '600', marginBottom: 4 },
  codeValue: { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  detailText: { fontSize: 15, fontWeight: '500', flex: 1 },
  actions: { paddingHorizontal: 24, gap: 10 },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 15, fontWeight: '600' },
})
