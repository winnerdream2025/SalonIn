import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { bookingsApi } from '../../services/booking/booking.api'
import type { BookingResult } from '../../services/booking/booking.types'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

export default function PaymentHistoryScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    bookingsApi.getMyBookings()
      .then((all) => setBookings(all.filter((b) => b.status === 'COMPLETED' && b.price > 0)))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const total = bookings.reduce((sum, b) => sum + b.price, 0)

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Payment History</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#D85A30" /></View>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            No completed payments yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}>
          {/* Summary card */}
          <View style={[styles.summaryCard, { backgroundColor: '#D85A30' }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>Total Spent</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 4 }}>
              {formatPrice(total, bookings[0]?.currency ?? 'usd')}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              {bookings.length} completed booking{bookings.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 16, marginBottom: 8 }]}>TRANSACTIONS</Text>

          {bookings.map((b) => (
            <View
              key={b.id}
              style={[styles.row, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#D85A30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
                  {b.service?.name ?? 'Service'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
                  {formatDate(b.date)} · {b.startTime}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary }}>
                {formatPrice(b.price, b.currency)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  summaryCard: {
    borderRadius: 20, padding: 24, marginBottom: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
})
