import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useBookingAnalytics } from '../../services/booking/booking.hooks'

type Period = '7d' | '30d' | '90d' | '1y'

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '1y',  label: '1 year' },
]

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{rate}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.bg.input }]}>
        <View style={[styles.barFill, { width: `${Math.min(rate, 100)}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

export default function AnalyticsDashboardScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const [period, setPeriod] = useState<Period>('30d')
  const { analytics, isLoading, error, refetch } = useBookingAnalytics(period)

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Analytics</Text>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[
                styles.periodChip,
                p.key === period
                  ? { backgroundColor: '#D85A30', borderColor: '#D85A30' }
                  : { backgroundColor: theme.bg.input, borderColor: theme.border.default },
              ]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: p.key === period ? '#FFF' : theme.text.secondary }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3, 4].map((k) => <Skeleton key={k} height={90} radius={16} />)}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12 }}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={[styles.retryBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : analytics ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

          {/* KPI row */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#D85A30' }}>{analytics.total}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Total Bookings</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#1D9E75' }}>{formatCurrency(analytics.revenue)}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Revenue</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#6366F1' }}>{analytics.completed}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Completed</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#F59E0B' }}>{analytics.repeatClients}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Repeat Clients</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#EF4444' }}>
                -{formatCurrency(analytics.platformFees ?? 0)}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Platform Fees (2%)</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.bg.surface, borderColor: '#1D9E75', borderWidth: 1.5 }]}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D9E75' }}>
                {formatCurrency(analytics.netRevenue ?? analytics.revenue)}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>Net Revenue</Text>
            </View>
          </View>

          {/* Rate bars */}
          <View style={[styles.section, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Performance Rates</Text>
            <RateBar label="Completion Rate" rate={analytics.completionRate} color="#1D9E75" />
            <RateBar label="Cancellation Rate" rate={analytics.cancellationRate} color="#E24B4A" />
            <RateBar label="No-show Rate" rate={analytics.noShowRate} color="#9CA3AF" />
          </View>

          {/* Top services */}
          {analytics.topServices.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Top Services</Text>
              {analytics.topServices.map((svc, i) => (
                <View key={svc.name} style={styles.serviceRow}>
                  <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#D85A30' : theme.bg.input }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: i === 0 ? '#FFF' : theme.text.secondary }}>
                      #{i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{svc.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>
                      {svc.count} booking{svc.count !== 1 ? 's' : ''} · {formatCurrency(svc.revenue)} earned
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Summary stats */}
          <View style={[styles.section, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Breakdown</Text>
            {[
              { label: 'Completed',  value: analytics.completed,  color: '#6366F1' },
              { label: 'Cancelled',  value: analytics.cancelled,  color: '#E24B4A' },
              { label: 'No-shows',   value: analytics.noShows,    color: '#9CA3AF' },
            ].map((row) => (
              <View key={row.label} style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: row.color }]} />
                <Text style={{ flex: 1, fontSize: 14, color: theme.text.secondary }}>{row.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{row.value}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  periodChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  retryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
