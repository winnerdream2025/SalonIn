import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { Role } from '@salonin/types'
import { messagesApi, parseApiError } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useProviderBookings, useBookingActions } from '../../services/booking/booking.hooks'
import { paymentsApi } from '../../services/booking/booking.api'
import type { BookingResult, BookingStatus } from '../../services/booking/booking.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ProviderTab = 'new' | 'today' | 'upcoming' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_FOR_TAB: Record<ProviderTab, BookingStatus[]> = {
  new:       ['PENDING_PAYMENT', 'PENDING'],
  today:     ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'],
  upcoming:  ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'],
  confirmed: ['CONFIRMED'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED', 'NO_SHOW'],
}

type DateFilter = 'today' | 'tomorrow' | 'week' | 'month'

const DATE_FILTER_LABELS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime12(t: string): string {
  // If already in AM/PM format, return as-is
  if (t.includes('AM') || t.includes('PM')) return t
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
})
function formatPrice(price: number, _currency: string): string {
  return priceFormatter.format(price)
}

// ─── Reschedule modal ─────────────────────────────────────────────────────────

function RescheduleModal({
  visible,
  booking,
  onConfirm,
  onClose,
  isWorking,
  theme,
}: {
  visible: boolean
  booking: BookingResult | null
  onConfirm: (date: string, time: string) => void
  onClose: () => void
  isWorking: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    if (booking) {
      setDate(booking.date)
      setTime(booking.startTime)
    }
  }, [booking])

  const inputStyle = {
    backgroundColor: theme.bg.input,
    borderColor: theme.border.default,
    color: theme.text.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.bg.elevated }]}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text.primary, marginBottom: 16 }}>
            Reschedule Appointment
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.tertiary, marginBottom: 4 }}>
            New date (YYYY-MM-DD)
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="e.g. 2026-07-15"
            placeholderTextColor={theme.text.tertiary}
            style={inputStyle}
          />
          <Text style={{ fontSize: 13, color: theme.text.tertiary, marginBottom: 4 }}>
            New start time (HH:mm)
          </Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 14:30"
            placeholderTextColor={theme.text.tertiary}
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalBtn, { borderColor: theme.border.default, flex: 1 }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontWeight: '600', color: theme.text.secondary, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(date.trim(), time.trim())}
              disabled={isWorking || !date.trim() || !time.trim()}
              style={[styles.modalBtn, { backgroundColor: '#D85A30', flex: 1, borderWidth: 0 }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
                {isWorking ? 'Saving...' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING_PAYMENT: '#F59E0B',
  PENDING:         '#F59E0B',
  CONFIRMED:       '#1D9E75',
  COMPLETED:       '#6366F1',
  CANCELLED:       '#E24B4A',
  NO_SHOW:         '#9CA3AF',
}

const StatusPill = React.memo(function StatusPill({ status }: { status: BookingStatus }) {
  const label = status === 'PENDING_PAYMENT' ? 'Awaiting Payment'
    : status === 'PENDING' ? 'Pending'
    : status === 'CONFIRMED' ? 'Confirmed'
    : status === 'COMPLETED' ? 'Completed'
    : status === 'NO_SHOW' ? 'No-show'
    : 'Cancelled'
  return (
    <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[status] + '22', borderColor: STATUS_COLOR[status] + '55' }]}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[status] }}>{label}</Text>
    </View>
  )
})

// ─── Booking card ─────────────────────────────────────────────────────────────

const ProviderBookingCard = React.memo(function ProviderBookingCard({
  item,
  onConfirm,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
  onRefund,
  onMessage,
  theme,
}: {
  item: BookingResult
  onConfirm: (b: BookingResult) => void
  onCancel: (b: BookingResult) => void
  onReschedule: (b: BookingResult) => void
  onComplete: (b: BookingResult) => void
  onNoShow: (b: BookingResult) => void
  onRefund: (b: BookingResult) => void
  onMessage: (b: BookingResult) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const isPending   = item.status === 'PENDING' || item.status === 'PENDING_PAYMENT'
  const isConfirmed = item.status === 'CONFIRMED'
  const isActive    = isPending || isConfirmed
  const isRefundable = !isActive && item.price > 0 && (item.status === 'CANCELLED' || item.status === 'NO_SHOW')

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      {/* Client info */}
      <View style={styles.cardHeader}>
        <View style={[styles.clientAvatar, { backgroundColor: theme.bg.input }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.secondary }}>
            {item.clientName[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary }}>
            {item.clientName}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>
            {item.clientEmail}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#D85A30' }}>
            {item.price > 0 ? formatPrice(item.price, item.currency ?? 'USD') : 'Free'}
          </Text>
          <StatusPill status={item.status} />
        </View>
      </View>

      {/* Service / date */}
      <View style={[styles.infoBlock, { borderTopColor: theme.border.subtle }]}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {item.service?.name ?? 'Appointment'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <Ionicons name="calendar-outline" size={13} color={theme.text.tertiary} />
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {formatDate(item.date)} · {formatTime12(item.startTime)}
            {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
          </Text>
        </View>
        {item.notes ? (
          <Text numberOfLines={2} style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 4, fontStyle: 'italic' }}>
            Note: {item.notes}
          </Text>
        ) : null}
        {item.confirmationCode ? (
          <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2 }}>
            Ref: {item.confirmationCode}
          </Text>
        ) : null}
        {(() => {
          const answers = item.intakeResponse?.answers
          const questions = item.intakeResponse?.form?.questions
          if (!answers || answers.length === 0) return null
          return (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Intake Form
              </Text>
              {answers.map((a, i) => {
                const q = questions?.find((q) => q.id === a.questionId)
                return (
                  <View key={i} style={{ marginBottom: 4 }}>
                    {q && (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary }}>{q.question}</Text>
                    )}
                    <Text style={{ fontSize: 12, color: theme.text.primary }}>{String(a.answer ?? '')}</Text>
                  </View>
                )
              })}
            </View>
          )
        })()}
      </View>

      {/* Actions */}
      {isActive && (
        <View style={styles.actionRow}>
          {isPending && (
            <TouchableOpacity
              onPress={() => onConfirm(item)}
              style={[styles.actionBtn, { backgroundColor: 'rgba(29,158,117,0.12)', borderColor: '#1D9E75' }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D9E75' }}>Confirm</Text>
            </TouchableOpacity>
          )}
          {isConfirmed && (
            <TouchableOpacity
              onPress={() => onComplete(item)}
              style={[styles.actionBtn, { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: '#6366F1' }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1' }}>Complete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onReschedule(item)}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCancel(item)}
            style={[styles.actionBtn, { backgroundColor: 'rgba(226,75,74,0.08)', borderColor: '#E24B4A' }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#E24B4A' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onNoShow(item)}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.tertiary }}>No-show</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMessage(item)}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubble-outline" size={14} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Refund (paid bookings that were cancelled or no-showed) */}
      {isRefundable && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => onRefund(item)}
            style={[styles.actionBtn, { backgroundColor: 'rgba(226,75,74,0.08)', borderColor: '#E24B4A', flex: 1 }]}
            activeOpacity={0.75}
          >
            <Ionicons name="card-outline" size={14} color="#E24B4A" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E24B4A' }}>Issue Refund</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
})

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TabBar = React.memo(function TabBar({
  active,
  onSelect,
  counts,
  theme,
}: {
  active: ProviderTab
  onSelect: (t: ProviderTab) => void
  counts: Record<ProviderTab, number>
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const tabs: { key: ProviderTab; label: string }[] = [
    { key: 'new',       label: 'New' },
    { key: 'today',     label: 'Today' },
    { key: 'upcoming',  label: 'Upcoming' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarScroll}
      style={[styles.tabBar, { borderBottomColor: theme.border.subtle }]}
    >
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onSelect(t.key)}
          activeOpacity={0.75}
          style={[
            styles.tab,
            active === t.key && { borderBottomColor: '#D85A30', borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: active === t.key ? '700' : '500',
              color: active === t.key ? theme.text.primary : theme.text.secondary,
            }}
          >
            {t.label}
          </Text>
          {counts[t.key] > 0 && (
            <View
              style={[
                styles.tabBadge,
                { backgroundColor: active === t.key ? '#D85A30' : theme.border.default },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: active === t.key ? '#FFFFFF' : theme.text.secondary,
                }}
              >
                {counts[t.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
})

// ─── Inner screen ─────────────────────────────────────────────────────────────

function ProviderBookingsInner({
  theme,
  bottom,
}: {
  theme: ReturnType<typeof useTheme>['theme']
  bottom: number
}) {
  const [activeTab, setActiveTab] = useState<ProviderTab>('new')
  const [dateFilter, setDateFilter] = useState<DateFilter | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingResult | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const today    = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrow  = useMemo(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10), [])

  const queryOpts = useMemo(() => ({
    dateFilter: activeTab === 'today' ? 'today' as DateFilter
      : activeTab === 'upcoming' ? 'week' as DateFilter
      : dateFilter,
    search: debouncedSearch || undefined,
  }), [activeTab, dateFilter, debouncedSearch])

  const { bookings, isLoading, error, refetch } = useProviderBookings(queryOpts)
  const { isWorking: isActionWorking, confirm: confirmAction, cancel: cancelAction, reschedule: rescheduleAction, complete: completeAction, noShow: noShowAction } = useBookingActions()

  const filtered = useMemo(() => bookings.filter((b) => {
    const statuses = STATUS_FOR_TAB[activeTab] as BookingStatus[]
    if (!statuses.includes(b.status)) return false
    if (activeTab === 'today') return b.date === today
    if (activeTab === 'upcoming') return b.date >= tomorrow
    return true
  }), [bookings, activeTab, today, tomorrow])

  const counts = useMemo<Record<ProviderTab, number>>(() => ({
    new:       bookings.filter(b => (STATUS_FOR_TAB.new as BookingStatus[]).includes(b.status)).length,
    today:     bookings.filter(b => (STATUS_FOR_TAB.today as BookingStatus[]).includes(b.status) && b.date === today).length,
    upcoming:  bookings.filter(b => (STATUS_FOR_TAB.upcoming as BookingStatus[]).includes(b.status) && b.date >= tomorrow).length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length,
  }), [bookings, today, tomorrow])

  const handleMessage = useCallback(async (b: BookingResult) => {
    if (!b.clientUserId) {
      Alert.alert('Guest booking', `Contact ${b.clientName} directly at ${b.clientEmail}`)
      return
    }
    try {
      const conv = await messagesApi.createConversation(b.clientUserId)
      router.push({
        pathname: '/chat/[id]',
        params: { id: conv.id, name: b.clientName, otherUserId: b.clientUserId, otherPhotoUrl: '' },
      } as never)
    } catch (e) {
      Alert.alert('Could not open chat', parseApiError(e))
    }
  }, [])

  const handleConfirm = useCallback(async (b: BookingResult) => {
    const ok = await confirmAction(b.id)
    if (!ok) Alert.alert('Error', 'Could not confirm booking.')
    else refetch()
  }, [confirmAction, refetch])

  const handleComplete = useCallback(async (b: BookingResult) => {
    Alert.alert('Mark Complete', `Mark ${b.clientName}'s appointment as completed?`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        const ok = await completeAction(b.id)
        if (!ok) Alert.alert('Error', 'Could not mark as complete.')
        else refetch()
      }},
    ])
  }, [completeAction, refetch])

  const handleNoShow = useCallback(async (b: BookingResult) => {
    Alert.alert('Mark No-show', `${b.clientName} didn't show up?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark No-show', style: 'destructive', onPress: async () => {
        const ok = await noShowAction(b.id)
        if (!ok) Alert.alert('Error', 'Could not mark as no-show.')
        else refetch()
      }},
    ])
  }, [noShowAction, refetch])

  const handleCancel = useCallback((b: BookingResult) => {
    Alert.alert('Cancel Booking', `Cancel ${b.clientName}'s ${b.service?.name ?? 'booking'}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
        const ok = await cancelAction(b.id)
        if (!ok) Alert.alert('Error', 'Could not cancel booking.')
        else refetch()
      }},
    ])
  }, [cancelAction, refetch])

  const handleRescheduleConfirm = useCallback(async (date: string, time: string) => {
    if (!rescheduleTarget) return
    const ok = await rescheduleAction(rescheduleTarget.id, date, time)
    if (!ok) Alert.alert('Error', 'Could not reschedule booking.')
    else { setRescheduleTarget(null); refetch() }
  }, [rescheduleAction, rescheduleTarget, refetch])

  const handleRefund = useCallback((b: BookingResult) => {
    Alert.alert(
      'Issue Refund',
      `Refund ${formatPrice(b.price, b.currency ?? 'USD')} to ${b.clientName} for ${b.service?.name ?? 'this booking'}?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentsApi.refund(b.id)
              Alert.alert('Refund issued', 'The payment has been refunded to the client.')
              refetch()
            } catch (e) {
              Alert.alert('Refund failed', parseApiError(e))
            }
          },
        },
      ],
    )
  }, [refetch])

  if (isLoading) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        {[1, 2, 3].map((k) => <Skeleton key={k} height={140} radius={16} />)}
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
        <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={refetch} style={[styles.retryBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: theme.border.subtle }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.bg.input, borderColor: theme.border.default }]}>
          <Ionicons name="search-outline" size={16} color={theme.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search client or ref code..."
            placeholderTextColor={theme.text.tertiary}
            style={{ flex: 1, fontSize: 14, color: theme.text.primary, marginLeft: 8 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date filter chips (shown on non-date-specific tabs) */}
      {activeTab !== 'today' && activeTab !== 'upcoming' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DATE_FILTER_LABELS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setDateFilter(dateFilter === f.key ? undefined : f.key)}
              style={[
                styles.chip,
                dateFilter === f.key
                  ? { backgroundColor: '#D85A30', borderColor: '#D85A30' }
                  : { backgroundColor: theme.bg.input, borderColor: theme.border.default },
              ]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: dateFilter === f.key ? '#FFF' : theme.text.secondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TabBar active={activeTab} onSelect={(t) => { setActiveTab(t); setDateFilter(undefined) }} counts={counts} theme={theme} />

      {filtered.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12 }}>No bookings found.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.text.tertiary} />}
          renderItem={({ item }) => (
            <ProviderBookingCard
              item={item}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onReschedule={(b) => setRescheduleTarget(b)}
              onComplete={handleComplete}
              onNoShow={handleNoShow}
              onRefund={handleRefund}
              onMessage={handleMessage}
              theme={theme}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <RescheduleModal
        visible={rescheduleTarget !== null}
        booking={rescheduleTarget}
        onConfirm={handleRescheduleConfirm}
        onClose={() => setRescheduleTarget(null)}
        isWorking={isActionWorking}
        theme={theme}
      />
    </>
  )
}


// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProviderBookingsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const currentUser = useAuthStore((s) => s.user)

  if (!currentUser || (currentUser.role !== Role.WORKER && currentUser.role !== Role.SALON)) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
          <Text style={styles.pageTitle}>Bookings</Text>
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 16, textAlign: 'center' }}>
            Sign in as a professional or salon to manage bookings.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={styles.pageTitle}>Bookings</Text>
      </View>
      <ProviderBookingsInner theme={theme} bottom={bottom} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  tabBarScroll: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 5,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexWrap: 'wrap',
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredState: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
})
