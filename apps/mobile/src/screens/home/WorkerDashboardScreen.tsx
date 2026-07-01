import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useAuthStore } from '../../store/authStore'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useProviderBookings } from '../../services/booking/booking.hooks'
import { NotificationBell } from '../../components/NotificationBell'
import type { BookingResult } from '../../services/booking/booking.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

type DayKey = 'today' | 'tomorrow' | 'day2'

const TODAY = new Date()
const TOMORROW = new Date(TODAY); TOMORROW.setDate(TODAY.getDate() + 1)
const DAY2 = new Date(TODAY); DAY2.setDate(TODAY.getDate() + 2)

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dayLabel(d: Date): string {
  const today = new Date()
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'TODAY'
  if (diff === 1) return 'TOMORROW'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
}

function formatTime12(t: string): string {
  if (t.includes('AM') || t.includes('PM')) return t
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', XOF: 'F' }

function formatRevenue(amount: number, currency = 'USD'): string {
  const sym = CURRENCY_SYMBOL[currency] ?? '$'
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#1D9E75',
  PENDING: '#EF9F27',
  PENDING_PAYMENT: '#EF9F27',
  COMPLETED: '#9CA3AF',
  CANCELLED: '#E24B4A',
  NO_SHOW: '#E24B4A',
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({
  booking,
  theme,
}: {
  booking: BookingResult
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const statusColor = STATUS_COLORS[booking.status] ?? theme.text.tertiary

  return (
    <TouchableOpacity
      onPress={() => router.push('/provider-bookings' as never)}
      activeOpacity={0.75}
      style={[styles.apptRow, { borderBottomColor: theme.border.subtle }]}
    >
      <View style={[styles.apptTimeBadge, { backgroundColor: theme.bg.elevated }]}>
        <Text style={[styles.apptTime, { color: theme.text.primary }]}>
          {formatTime12(booking.startTime)}
        </Text>
      </View>
      <View style={styles.apptInfo}>
        <Text style={[styles.apptClient, { color: theme.text.primary }]} numberOfLines={1}>
          {booking.clientName}
        </Text>
        <Text style={[styles.apptService, { color: theme.text.secondary }]} numberOfLines={1}>
          {booking.service?.name ?? 'Appointment'}
        </Text>
      </View>
      <View style={styles.apptRight}>
        <Text style={[styles.apptPrice, { color: theme.text.primary }]}>
          {formatRevenue(booking.price, booking.currency)}
        </Text>
        <View style={[styles.apptStatusDot, { backgroundColor: statusColor }]} />
      </View>
    </TouchableOpacity>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WorkerDashboardScreen() {
  const { theme, isDark } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const authUser = useAuthStore((s) => s.user)
  const { profile } = useMyWorkerProfile()

  const [selectedDay, setSelectedDay] = useState<DayKey>('today')

  const dateFilterMap: Record<DayKey, 'today' | 'tomorrow'> = {
    today: 'today',
    tomorrow: 'tomorrow',
    day2: 'tomorrow', // API doesn't have day2; filter client-side
  }

  const { bookings, isLoading, refetch } = useProviderBookings({
    dateFilter: dateFilterMap[selectedDay],
  })

  const dayISO = selectedDay === 'today' ? toISO(TODAY) : selectedDay === 'tomorrow' ? toISO(TOMORROW) : toISO(DAY2)

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === dayISO)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, dayISO],
  )

  const confirmedBookings = useMemo(
    () => dayBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'),
    [dayBookings],
  )

  const expectedRevenue = useMemo(
    () => confirmedBookings.reduce((sum, b) => sum + b.price, 0),
    [confirmedBookings],
  )

  const topCurrency = confirmedBookings[0]?.currency ?? 'USD'

  const uniqueClients = useMemo(
    () => new Set(dayBookings.map((b) => b.clientUserId ?? b.clientName)).size,
    [dayBookings],
  )

  const displayName = profile?.name ?? authUser?.email?.split('@')[0] ?? 'Pro'
  const firstName = displayName.split(' ')[0] ?? displayName

  const headline = useMemo(() => {
    if (dayBookings.length === 0) return 'Nothing booked yet.'
    if (dayBookings.length === 1) return 'One appointment today.'
    return "You've got a solid day ahead."
  }, [dayBookings.length])

  const handleRefresh = useCallback(() => { void refetch() }, [refetch])

  const DAYS: { key: DayKey; date: Date }[] = [
    { key: 'today', date: TODAY },
    { key: 'tomorrow', date: TOMORROW },
    { key: 'day2', date: DAY2 },
  ]

  const cardBg = isDark ? '#1C1C2E' : '#1A1A2E'

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.topAvatar} />
          ) : (
            <View style={[styles.topAvatar, styles.avatarFallback, { backgroundColor: 'rgba(216,90,48,0.12)' }]}>
              <Text style={[styles.avatarInitial, { color: theme.brand.primary }]}>
                {firstName[0]?.toUpperCase() ?? 'W'}
              </Text>
            </View>
          )}
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.hiText, { color: theme.text.secondary }]}>Hi,</Text>
            <Text style={[styles.nameText, { color: theme.text.primary }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/messages' as never)}
            style={styles.topBtn}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={22} color={theme.text.secondary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={theme.brand.primary} />}
      >
        {/* ── Headline ── */}
        <View style={styles.headlineWrap}>
          <Text style={[styles.headline, { color: theme.text.primary }]}>
            {headline}
          </Text>
        </View>

        {/* ── Day tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsRow}
        >
          {DAYS.map(({ key, date }) => {
            const active = selectedDay === key
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedDay(key)}
                activeOpacity={0.8}
                style={[
                  styles.dayTab,
                  active
                    ? { backgroundColor: theme.text.primary }
                    : { backgroundColor: theme.bg.surface, borderColor: theme.border.default, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.dayTabText, { color: active ? theme.bg.base : theme.text.secondary }]}>
                  {dayLabel(date)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* ── Stats cards ── */}
        <View style={[styles.revenueCard, { backgroundColor: cardBg }]}>
          <View style={styles.revenueTop}>
            <Text style={styles.revenueLabel}>EXPECTED REVENUE</Text>
            <View style={styles.revenueValueRow}>
              <Text style={styles.revenueValue}>
                {formatRevenue(expectedRevenue, topCurrency)}
              </Text>
              <Ionicons name="trending-up" size={18} color="#4ADE80" style={{ marginLeft: 6 }} />
            </View>
          </View>
          <View style={styles.revenueBar}>
            <View
              style={[
                styles.revenueBarFill,
                { width: expectedRevenue > 0 ? `${Math.min((confirmedBookings.length / Math.max(dayBookings.length, 1)) * 100, 100)}%` : '4%' },
              ]}
            />
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>APPOINTMENTS</Text>
              <Ionicons name="trending-up" size={14} color="#4ADE80" />
            </View>
            <Text style={styles.statValue}>{dayBookings.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>CLIENTS TODAY</Text>
              <Ionicons name="trending-up" size={14} color="#4ADE80" />
            </View>
            <Text style={styles.statValue}>{uniqueClients}</Text>
          </View>
        </View>

        {/* ── Appointments list ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {selectedDay === 'today' ? "Today's Appointments" : selectedDay === 'tomorrow' ? "Tomorrow's Appointments" : `${dayLabel(DAY2)}'s Appointments`}
          </Text>
          {dayBookings.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/provider-bookings' as never)}
              hitSlop={8}
            >
              <Text style={[styles.seeAll, { color: theme.brand.primary }]}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.brand.primary} />
          </View>
        ) : dayBookings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Ionicons name="calendar-outline" size={32} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No appointments {selectedDay === 'today' ? 'today' : selectedDay === 'tomorrow' ? 'tomorrow' : 'this day'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/provider-availability' as never)}
              style={[styles.availBtn, { borderColor: theme.border.default }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.availBtnText, { color: theme.text.primary }]}>Manage Availability</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.apptList, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            {dayBookings.map((b) => (
              <AppointmentRow key={b.id} booking={b} theme={theme} />
            ))}
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push('/provider-availability' as never)}
            style={[styles.qaBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Ionicons name="time-outline" size={18} color={theme.brand.primary} />
            <Text style={[styles.qaBtnText, { color: theme.text.primary }]}>Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/earnings' as never)}
            style={[styles.qaBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Ionicons name="cash-outline" size={18} color="#1D9E75" />
            <Text style={[styles.qaBtnText, { color: theme.text.primary }]}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/manage-services' as never)}
            style={[styles.qaBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Ionicons name="list-outline" size={18} color="#6366F1" />
            <Text style={[styles.qaBtnText, { color: theme.text.primary }]}>Services</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  topAvatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '800' },
  hiText: { fontSize: 12, fontWeight: '400' },
  nameText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBtn: { padding: 2 },

  // ── Headline ──
  headlineWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
  },

  // ── Day tabs ──
  dayTabsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  dayTabText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  // ── Revenue card ──
  revenueCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
  },
  revenueTop: { marginBottom: 16 },
  revenueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  revenueValueRow: { flexDirection: 'row', alignItems: 'center' },
  revenueValue: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  revenueBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
  },
  revenueBarFill: {
    height: 4,
    backgroundColor: '#4ADE80',
    borderRadius: 2,
  },

  // ── Stat cards ──
  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // ── Appointments list ──
  apptList: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  apptTimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 62,
    alignItems: 'center',
  },
  apptTime: { fontSize: 12, fontWeight: '700' },
  apptInfo: { flex: 1, minWidth: 0 },
  apptClient: { fontSize: 14, fontWeight: '700' },
  apptService: { fontSize: 12, marginTop: 2 },
  apptRight: { alignItems: 'flex-end', gap: 4 },
  apptPrice: { fontSize: 14, fontWeight: '700' },
  apptStatusDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Empty state ──
  loadingWrap: { padding: 32, alignItems: 'center' },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  availBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  availBtnText: { fontSize: 13, fontWeight: '600' },

  // ── Quick actions ──
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  qaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  qaBtnText: { fontSize: 11, fontWeight: '600' },
})
