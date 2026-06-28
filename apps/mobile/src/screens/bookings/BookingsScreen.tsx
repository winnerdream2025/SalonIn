import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { messagesApi, workersApi, salonsApi, parseApiError } from '@salonin/api-client'
import { bookingsApi } from '../../services/booking/booking.api'
import type { BookingResult } from '../../services/booking/booking.types'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingTab = 'upcoming' | 'completed' | 'cancelled'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyStatus(status: BookingResult['status']): BookingTab {
  if (status === 'PENDING' || status === 'CONFIRMED' || status === 'PENDING_PAYMENT') return 'upcoming'
  if (status === 'CANCELLED') return 'cancelled'
  return 'completed'
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}


function formatTime12(t: string): string {
  if (t.includes('AM') || t.includes('PM')) return t
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

function statusColor(status: BookingResult['status']): string {
  switch (status) {
    case 'CONFIRMED':      return '#1D9E75'
    case 'PENDING':        return '#EF9F27'
    case 'PENDING_PAYMENT':return '#EF9F27'
    case 'CANCELLED':      return '#E24B4A'
    case 'COMPLETED':      return '#6B6B6B'
    case 'NO_SHOW':        return '#6B6B6B'
    default:               return '#6B6B6B'
  }
}

function statusLabel(status: BookingResult['status']): string {
  switch (status) {
    case 'CONFIRMED':       return 'Confirmed'
    case 'PENDING':         return 'Pending'
    case 'PENDING_PAYMENT': return 'Pending Payment'
    case 'CANCELLED':       return 'Cancelled'
    case 'COMPLETED':       return 'Completed'
    case 'NO_SHOW':         return 'No Show'
    default:                return status
  }
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({
  item,
  onMessage,
  onCancel,
  onReschedule,
  onRebook,
  onReview,
  theme,
}: {
  item: BookingResult
  onMessage: (item: BookingResult) => void
  onCancel: (item: BookingResult) => void
  onReschedule: (item: BookingResult) => void
  onRebook: (item: BookingResult) => void
  onReview: (item: BookingResult) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const tab = classifyStatus(item.status)
  const isUpcoming = tab === 'upcoming'
  const isCompleted = tab === 'completed'

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary }}>
            {item.service?.name ?? 'Appointment'}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>
            {item.clientName}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}18` }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(item.status) }}>
            {statusLabel(item.status).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Date / time / price */}
      <View style={[styles.infoRow, { borderTopColor: theme.border.subtle }]}>
        <Ionicons name="calendar-outline" size={14} color={theme.text.tertiary} />
        <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 6 }}>
          {formatDate(item.date)}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.tertiary, marginLeft: 4 }}>
          · {formatTime12(item.startTime)}{item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#D85A30' }}>
          {item.price > 0 ? formatPrice(item.price, item.currency) : 'Free'}
        </Text>
      </View>

      {/* Confirmation code */}
      {item.confirmationCode ? (
        <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 4 }}>
          Ref: {item.confirmationCode}
        </Text>
      ) : null}

      {/* Action buttons */}
      {isUpcoming && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => onMessage(item)}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReschedule(item)}
            style={[styles.actionBtn, { borderColor: '#EF9F2740' }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF9F27' }}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCancel(item)}
            style={[styles.actionBtn, { borderColor: '#E24B4A30' }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#E24B4A' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {isCompleted && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => onReview(item)}
            style={[styles.actionBtn, { borderColor: '#EF9F2740', flex: 1 }]}
            activeOpacity={0.75}
          >
            <Ionicons name="star-outline" size={13} color="#EF9F27" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF9F27' }}>Leave Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRebook(item)}
            style={[styles.actionBtn, { borderColor: '#D85A3040', flex: 1 }]}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={13} color="#D85A30" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#D85A30' }}>Book Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onSelect,
  counts,
  theme,
}: {
  active: BookingTab
  onSelect: (t: BookingTab) => void
  counts: Record<BookingTab, number>
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const tabs: { key: BookingTab; label: string }[] = [
    { key: 'upcoming',  label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <View style={[styles.tabBar, { borderBottomColor: theme.border.subtle }]}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onSelect(t.key)}
          activeOpacity={0.75}
          style={[styles.tab, active === t.key && { borderBottomColor: '#D85A30', borderBottomWidth: 2 }]}
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
            <View style={[styles.tabBadge, { backgroundColor: active === t.key ? '#D85A30' : theme.border.default }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: active === t.key ? '#FFFFFF' : theme.text.secondary }}>
                {counts[t.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const currentUser = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab]     = useState<BookingTab>('upcoming')
  const [allBookings, setAllBookings] = useState<BookingResult[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(() => {
    if (!currentUser) return
    setIsLoading(true)
    setError(null)

    bookingsApi
      .getMyBookings()
      .then((data) => setAllBookings(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load bookings'))
      .finally(() => setIsLoading(false))
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const filtered = allBookings.filter((b) => classifyStatus(b.status) === activeTab)

  const counts: Record<BookingTab, number> = {
    upcoming:  allBookings.filter((b) => classifyStatus(b.status) === 'upcoming').length,
    completed: allBookings.filter((b) => classifyStatus(b.status) === 'completed').length,
    cancelled: allBookings.filter((b) => classifyStatus(b.status) === 'cancelled').length,
  }

  const [rescheduleTarget, setRescheduleTarget] = useState<BookingResult | null>(null)
  const [rescheduleDate,    setRescheduleDate]   = useState('')
  const [rescheduleTime,    setRescheduleTime]   = useState('')
  const [rebookTarget,     setRebookTarget]      = useState<BookingResult | null>(null)
  const [rebookDate,       setRebookDate]        = useState('')
  const [rebookTime,       setRebookTime]        = useState('')
  const [isActioning,      setIsActioning]       = useState(false)

  const handleMessage = useCallback(async (item: BookingResult) => {
    if (!currentUser) return
    try {
      // Resolve provider's User.id from their profile ID
      let providerUserId: string | null = null
      if (item.providerType === 'salon') {
        const salon = await salonsApi.getById(item.providerId).catch(() => null)
        providerUserId = (salon as any)?.userId ?? null
      } else {
        const worker = await workersApi.getById(item.providerId).catch(() => null)
        providerUserId = (worker as any)?.userId ?? null
      }
      if (providerUserId) {
        const conv = await messagesApi.createConversation(providerUserId)
        router.push({
          pathname: '/chat/[id]',
          params: { id: conv.id, name: item.service?.name ?? 'Provider', otherUserId: providerUserId, otherPhotoUrl: '' },
        } as never)
      } else {
        router.push('/(tabs)/messages' as never)
      }
    } catch (e) {
      Alert.alert('Could not open chat', parseApiError(e))
    }
  }, [currentUser])

  const handleCancel = useCallback((item: BookingResult) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your ${item.service?.name ?? 'booking'} on ${formatDate(item.date)}?`,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            if (!item.cancelToken) {
              Alert.alert('Cannot cancel', 'Please message the provider to cancel.')
              return
            }
            setIsActioning(true)
            try {
              await bookingsApi.clientCancel(item.id, item.cancelToken)
              load()
            } catch {
              Alert.alert('Error', 'Could not cancel booking. Please try again.')
            } finally { setIsActioning(false) }
          },
        },
      ],
    )
  }, [load])

  const handleReschedule = useCallback((item: BookingResult) => {
    setRescheduleTarget(item)
    setRescheduleDate('')
    setRescheduleTime('')
  }, [])

  const handleRebook = useCallback((item: BookingResult) => {
    setRebookTarget(item)
    setRebookDate('')
    setRebookTime('')
  }, [])

  const handleReview = useCallback(async (item: BookingResult) => {
    try {
      let providerUserId: string | null = null
      let providerName = item.service?.name ?? 'Provider'
      let providerPhoto = ''
      if (item.providerType === 'salon') {
        const salon = await salonsApi.getById(item.providerId).catch(() => null)
        providerUserId = (salon as any)?.userId ?? null
        providerName = (salon as any)?.name ?? providerName
        providerPhoto = (salon as any)?.photoUrls?.[0] ?? ''
      } else {
        const worker = await workersApi.getById(item.providerId).catch(() => null)
        providerUserId = (worker as any)?.userId ?? null
        providerName = (worker as any)?.name ?? providerName
        providerPhoto = (worker as any)?.photoUrl ?? ''
      }
      if (!providerUserId) {
        Alert.alert('Cannot review', 'Could not find this provider. Please try again later.')
        return
      }
      router.push({
        pathname: '/review/leave',
        params: { subjectId: providerUserId, subjectName: providerName, subjectPhoto: providerPhoto },
      } as never)
    } catch (e) {
      Alert.alert('Cannot review', parseApiError(e))
    }
  }, [])

  const handleRebookConfirm = useCallback(async () => {
    if (!rebookTarget || !rebookDate.trim() || !rebookTime.trim()) {
      Alert.alert('Missing info', 'Enter a date (YYYY-MM-DD) and time (e.g. 14:30).')
      return
    }
    setIsActioning(true)
    try {
      await bookingsApi.rebook(rebookTarget.id, rebookDate.trim(), rebookTime.trim())
      setRebookTarget(null)
      Alert.alert('Booking requested', 'Your new appointment has been submitted.')
      load()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create booking.')
    } finally {
      setIsActioning(false)
    }
  }, [rebookTarget, rebookDate, rebookTime, load])

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleTarget || !rescheduleDate.trim() || !rescheduleTime.trim()) {
      Alert.alert('Missing info', 'Enter a date (YYYY-MM-DD) and time (e.g. 14:30).')
      return
    }
    const token     = rescheduleTarget.rescheduleToken ?? rescheduleTarget.cancelToken
    const tokenType = rescheduleTarget.rescheduleToken ? 'rescheduleToken' as const : 'cancelToken' as const
    if (!token) {
      Alert.alert('Cannot reschedule', 'Please message the provider to reschedule.')
      setRescheduleTarget(null)
      return
    }
    setIsActioning(true)
    try {
      await bookingsApi.clientReschedule(rescheduleTarget.id, token, tokenType, rescheduleDate.trim(), rescheduleTime.trim())
      setRescheduleTarget(null)
      load()
    } catch {
      Alert.alert('Error', 'Could not reschedule booking. Please try again.')
    } finally { setIsActioning(false) }
  }, [rescheduleTarget, rescheduleDate, rescheduleTime, load])

  if (!currentUser) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
          <Text style={styles.pageTitle}>My Bookings</Text>
        </View>
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 16, textAlign: 'center', fontSize: 15 }}>
            Sign in to view your bookings.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={styles.pageTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <TabBar active={activeTab} onSelect={setActiveTab} counts={counts} theme={theme} />

      {/* Content */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} height={120} radius={16} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={load}
            style={[styles.retryBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12 }}>
            {activeTab === 'upcoming'  ? 'No upcoming bookings.' :
             activeTab === 'completed' ? 'No completed bookings yet.' :
                                         'No cancelled bookings.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={load}
              tintColor={theme.text.tertiary}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onMessage={handleMessage}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onRebook={handleRebook}
              onReview={handleReview}
              theme={theme}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Rebook modal */}
      <Modal
        visible={rebookTarget !== null}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setRebookTarget(null)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.bg.base }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={() => setRebookTarget(null)}>
              <Text style={{ color: theme.text.secondary, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Book Again</Text>
            <TouchableOpacity onPress={handleRebookConfirm} disabled={isActioning}>
              {isActioning
                ? <ActivityIndicator size="small" color="#D85A30" />
                : <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '700' }}>Confirm</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 20 }}>
              Rebook {rebookTarget?.service?.name ?? 'this service'} with the same provider. Pick a new date and time.
            </Text>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6, textTransform: 'uppercase' }}>Date</Text>
              <TextInput
                value={rebookDate}
                onChangeText={setRebookDate}
                placeholder="YYYY-MM-DD  e.g. 2026-07-20"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.modalInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6, textTransform: 'uppercase' }}>Time</Text>
              <TextInput
                value={rebookTime}
                onChangeText={setRebookTime}
                placeholder="HH:MM  e.g. 10:00"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.modalInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule modal */}
      <Modal
        visible={rescheduleTarget !== null}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setRescheduleTarget(null)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.bg.base }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={() => setRescheduleTarget(null)}>
              <Text style={{ color: theme.text.secondary, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Reschedule</Text>
            <TouchableOpacity onPress={handleRescheduleConfirm} disabled={isActioning}>
              {isActioning
                ? <ActivityIndicator size="small" color="#D85A30" />
                : <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '700' }}>Confirm</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 20 }}>
              Enter your preferred new date and time. The provider will confirm the change.
            </Text>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6, textTransform: 'uppercase' }}>New Date</Text>
              <TextInput
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="YYYY-MM-DD  e.g. 2026-07-15"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.modalInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6, textTransform: 'uppercase' }}>New Time</Text>
              <TextInput
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
                placeholder="HH:MM  e.g. 14:30"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.modalInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
          </View>
        </View>
      </Modal>

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
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
})
