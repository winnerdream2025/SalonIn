import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { bookingsApi, stripeConnectApi } from '../../src/services/booking/booking.api'
import { useBookingAnalytics } from '../../src/services/booking/booking.hooks'
import type { BookingResult, StripeConnectStatus } from '../../src/services/booking/booking.types'
import { formatBookingDate, formatTime12, formatBookingPrice } from '../../src/components/cards/BookingCard'

type Period = '7d' | '30d' | '90d' | '1y'

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',  label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y',  label: '1y' },
]

function formatCurrencyFull(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

export default function EarningsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const [period, setPeriod] = useState<Period>('30d')
  const { analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useBookingAnalytics(period)

  const [completedBookings, setCompletedBookings] = useState<BookingResult[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadBookings = useCallback(async () => {
    try {
      const data = await bookingsApi.getProviderBookingsFiltered({ status: 'COMPLETED' })
      setCompletedBookings(data)
    } catch {
      setCompletedBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  const loadStripe = useCallback(async () => {
    try {
      const s = await stripeConnectApi.getStatus()
      setStripeStatus(s)
    } catch {
      setStripeStatus(null)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
    void loadStripe()
  }, [loadBookings, loadStripe])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([loadBookings(), refetchAnalytics()])
    setIsRefreshing(false)
  }, [loadBookings, refetchAnalytics])

  const handleSetupStripe = useCallback(async () => {
    router.push('/stripe-connect' as never)
  }, [])

  const handleOpenDashboard = useCallback(async () => {
    try {
      const link = await stripeConnectApi.getDashboardUrl()
      if (link?.url) {
        await Linking.openURL(link.url)
      }
    } catch {
      router.push('/stripe-connect' as never)
    }
  }, [])

  const stripeReady = stripeStatus?.connected

  // Filter bookings to current period
  const now = new Date()
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const filteredBookings = completedBookings.filter((b) => new Date(b.date) >= cutoff)

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3, marginLeft: 12 }}>
          Earnings
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/analytics' as never)}
          hitSlop={12}
          activeOpacity={0.7}
          style={{ marginLeft: 'auto' }}
        >
          <Text style={{ fontSize: 13, color: '#D85A30', fontWeight: '600' }}>Analytics</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.text.tertiary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <View style={[styles.periodRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.75}
              style={[styles.periodChip, period === p.key && { backgroundColor: '#D85A30' }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: period === p.key ? '#fff' : theme.text.secondary }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        {analyticsLoading ? (
          <Skeleton width="100%" height={140} radius={20} />
        ) : analytics ? (
          <View style={[styles.summaryCard, { backgroundColor: '#D85A30' }]}>
            <Text style={styles.summaryLabel}>Net Earnings</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrencyFull(analytics.netRevenue ?? analytics.revenue)}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{analytics.completed}</Text>
                <Text style={styles.summaryItemLabel}>Completed</Text>
              </View>
              <View style={[styles.summaryDivider]} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{analytics.completionRate}%</Text>
                <Text style={styles.summaryItemLabel}>Completion</Text>
              </View>
              <View style={[styles.summaryDivider]} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{analytics.repeatClients}</Text>
                <Text style={styles.summaryItemLabel}>Repeat clients</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Stripe payout status */}
        <View style={[styles.stripeCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.stripeIcon, { backgroundColor: stripeReady ? 'rgba(29,158,117,0.15)' : 'rgba(216,90,48,0.10)' }]}>
              <Ionicons
                name={stripeReady ? 'card' : 'card-outline'}
                size={20}
                color={stripeReady ? '#1D9E75' : '#D85A30'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>
                {stripeReady ? 'Payouts Active' : 'Set Up Payouts'}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 1 }}>
                {stripeReady
                  ? 'Payouts are active on your account'
                  : 'Connect your bank account to receive payments'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={stripeReady ? handleOpenDashboard : handleSetupStripe}
              activeOpacity={0.8}
              style={[styles.stripeBtn, { backgroundColor: stripeReady ? theme.bg.elevated : '#D85A30' }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: stripeReady ? theme.text.primary : '#fff' }}>
                {stripeReady ? 'Dashboard' : 'Set Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top services */}
        {analytics && analytics.topServices.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Top Services</Text>
            {analytics.topServices.slice(0, 3).map((svc, i) => (
              <View key={i} style={[styles.topServiceRow, { borderBottomColor: theme.border.subtle }]}>
                <Text style={{ fontSize: 14, color: theme.text.primary, flex: 1 }}>{svc.name}</Text>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginRight: 12 }}>
                  {svc.count} appts
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D9E75' }}>
                  {formatCurrencyFull(svc.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Completed bookings list */}
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          Completed Appointments
          {filteredBookings.length > 0 ? ` (${filteredBookings.length})` : ''}
        </Text>

        {bookingsLoading ? (
          <View style={{ gap: 10 }}>
            <Skeleton width="100%" height={72} radius={14} />
            <Skeleton width="100%" height={72} radius={14} />
            <Skeleton width="100%" height={72} radius={14} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.bg.elevated }]}>
            <Ionicons name="cash-outline" size={36} color={theme.text.tertiary} />
            <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center', fontSize: 14 }}>
              No completed appointments in this period.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredBookings.map((b) => (
              <View
                key={b.id}
                style={[styles.bookingRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>
                    {b.clientName}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>
                    {b.service?.name ?? 'Appointment'} · {formatBookingDate(b.date)} {formatTime12(b.startTime)}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1D9E75' }}>
                  {b.price > 0 ? formatBookingPrice(b.price, b.currency) : 'Free'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.6 },
  summaryAmount: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, marginVertical: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  summaryItemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },
  stripeCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  stripeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  topServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
})
