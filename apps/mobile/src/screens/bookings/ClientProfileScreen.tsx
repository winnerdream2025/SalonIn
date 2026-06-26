import React from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useClientHistory } from '../../services/booking/booking.hooks'
import type { BookingStatus } from '../../services/booking/booking.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING_PAYMENT: '#F59E0B',
  PENDING:         '#F59E0B',
  CONFIRMED:       '#1D9E75',
  COMPLETED:       '#6366F1',
  CANCELLED:       '#E24B4A',
  NO_SHOW:         '#9CA3AF',
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime12(t: string): string {
  if (t.includes('AM') || t.includes('PM')) return t
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color, theme }: {
  label: string; value: string | number; color: string
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <Text style={{ fontSize: 20, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.text.secondary, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClientProfileScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    clientEmail: string
    clientName: string
    clientPhone?: string
    totalBookings?: string
    totalSpent?: string
    completedBookings?: string
    cancelledBookings?: string
    noShowBookings?: string
    lastVisit?: string
  }>()

  const { bookings, isLoading } = useClientHistory(params.clientEmail ?? null)

  const totalSpent = parseFloat(params.totalSpent ?? '0')
  const totalBookings = parseInt(params.totalBookings ?? '0', 10)
  const completedBookings = parseInt(params.completedBookings ?? '0', 10)
  const cancelledBookings = parseInt(params.cancelledBookings ?? '0', 10)
  const noShowBookings = parseInt(params.noShowBookings ?? '0', 10)

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {params.clientName ?? 'Client'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <View style={[styles.avatar, { backgroundColor: '#D85A3022' }]}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#D85A30' }}>
              {(params.clientName ?? '?')[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text.primary, marginTop: 10 }}>
            {params.clientName}
          </Text>
          <Text style={{ fontSize: 14, color: theme.text.secondary, marginTop: 2 }}>{params.clientEmail}</Text>

          {/* Contact buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {params.clientPhone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${params.clientPhone}`)}
                style={[styles.contactBtn, { backgroundColor: '#1D9E7518', borderColor: '#1D9E75' }]}
                activeOpacity={0.75}
              >
                <Ionicons name="call-outline" size={15} color="#1D9E75" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1D9E75', marginLeft: 5 }}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${params.clientEmail}`)}
              style={[styles.contactBtn, { backgroundColor: '#6366F118', borderColor: '#6366F1' }]}
              activeOpacity={0.75}
            >
              <Ionicons name="mail-outline" size={15} color="#6366F1" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#6366F1', marginLeft: 5 }}>Email</Text>
            </TouchableOpacity>
          </View>

          {params.lastVisit ? (
            <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 10 }}>
              Last visit: {formatDate(params.lastVisit)}
            </Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip label="Total" value={totalBookings} color={theme.text.primary} theme={theme} />
          <StatChip label="Revenue" value={formatCurrency(totalSpent)} color="#1D9E75" theme={theme} />
          <StatChip label="Done" value={completedBookings} color="#6366F1" theme={theme} />
          <StatChip label="No-shows" value={noShowBookings} color="#9CA3AF" theme={theme} />
          <StatChip label="Cancelled" value={cancelledBookings} color="#E24B4A" theme={theme} />
        </View>

        {/* Booking history */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text.primary, marginBottom: 12 }}>
            Booking History
          </Text>

          {isLoading ? (
            <View style={{ gap: 8 }}>
              {[1,2,3].map(k => <Skeleton key={k} height={80} radius={12} />)}
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={36} color={theme.text.tertiary} />
              <Text style={{ color: theme.text.secondary, marginTop: 10 }}>No bookings yet.</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <View
                key={b.id}
                style={[styles.historyCard, {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.subtle,
                  borderLeftColor: STATUS_COLOR[b.status],
                }]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>
                      {b.service?.name ?? 'Appointment'}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>
                      {formatDate(b.date)} · {formatTime12(b.startTime)}
                    </Text>
                    {b.confirmationCode ? (
                      <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 1 }}>
                        {b.confirmationCode}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#D85A30' }}>
                      {b.price > 0 ? formatCurrency(b.price) : 'Free'}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[b.status] }}>
                      {b.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
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
    gap: 12,
  },
  backBtn: { padding: 4 },
  pageTitle: {
    flex: 1,
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  profileCard: {
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flex: 1,
    minWidth: 60,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
})
