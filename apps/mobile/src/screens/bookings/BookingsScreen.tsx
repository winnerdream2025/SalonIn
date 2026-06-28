import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { messagesApi, workersApi, salonsApi, parseApiError } from '@salonin/api-client'
import { availabilityApi, bookingsApi } from '../../services/booking/booking.api'
import type { AvailabilitySlot, BookingResult } from '../../services/booking/booking.types'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingTab = 'upcoming' | 'completed' | 'cancelled'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyStatus(status: BookingResult['status']): BookingTab {
  if (status === 'PENDING' || status === 'CONFIRMED' || status === 'PENDING_PAYMENT') return 'upcoming'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'cancelled'
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

// ─── DateSlotPicker ──────────────────────────────────────────────────────────

function buildPickerDateRange(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function DateSlotPicker({
  title,
  pickerDate,
  onDateChange,
  pickerSelectedTime,
  onTimeSelect,
  pickerSlots,
  pickerSlotsLoading,
  theme,
}: {
  title: string
  pickerDate: string
  onDateChange: (d: string) => void
  pickerSelectedTime: string | null
  onTimeSelect: (t: string) => void
  pickerSlots: AvailabilitySlot[]
  pickerSlotsLoading: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const dateRange = buildPickerDateRange()
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.pickerTitle, { color: theme.text.secondary }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {dateRange.map((date) => {
          const d = new Date(`${date}T00:00:00`)
          const active = date === pickerDate
          return (
            <TouchableOpacity
              key={date}
              onPress={() => onDateChange(date)}
              activeOpacity={0.75}
              style={[styles.dateChip, {
                backgroundColor: active ? '#D85A30' : theme.bg.surface,
                borderColor: active ? '#D85A30' : theme.border.default,
              }]}
            >
              <Text style={{ fontSize: 10, color: active ? '#fff' : theme.text.tertiary, fontWeight: '600' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : theme.text.primary }}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      {pickerSlotsLoading ? (
        <View style={{ alignItems: 'center', padding: 24 }}><ActivityIndicator color="#D85A30" /></View>
      ) : pickerSlots.length === 0 ? (
        <Text style={{ color: theme.text.tertiary, textAlign: 'center', padding: 24, fontSize: 13 }}>
          No available slots on this day
        </Text>
      ) : (
        <View style={styles.slotGrid}>
          {pickerSlots.map((slot) => {
            const active = slot.time === pickerSelectedTime
            return (
              <TouchableOpacity
                key={slot.time}
                onPress={() => onTimeSelect(slot.time)}
                activeOpacity={0.75}
                style={[styles.slotChip, {
                  backgroundColor: active ? '#D85A30' : theme.bg.surface,
                  borderColor: active ? '#D85A30' : theme.border.default,
                }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text.primary }}>
                  {formatTime12(slot.time)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
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

  const [rescheduleTarget,   setRescheduleTarget]   = useState<BookingResult | null>(null)
  const [rebookTarget,       setRebookTarget]       = useState<BookingResult | null>(null)
  const [isActioning,        setIsActioning]        = useState(false)
  const [pickerDate,         setPickerDate]         = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [pickerSelectedTime, setPickerSelectedTime] = useState<string | null>(null)
  const [pickerSlots,        setPickerSlots]        = useState<AvailabilitySlot[]>([])
  const [pickerSlotsLoading, setPickerSlotsLoading] = useState(false)

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
    setPickerSelectedTime(null)
    setPickerDate(new Date().toISOString().slice(0, 10))
  }, [])

  const handleRebook = useCallback((item: BookingResult) => {
    setRebookTarget(item)
    setPickerSelectedTime(null)
    setPickerDate(new Date().toISOString().slice(0, 10))
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
    if (!rebookTarget || !pickerDate || !pickerSelectedTime) {
      Alert.alert('Missing info', 'Pick a date and available time slot.')
      return
    }
    setIsActioning(true)
    try {
      await bookingsApi.rebook(rebookTarget.id, pickerDate, pickerSelectedTime)
      setRebookTarget(null)
      Alert.alert('Booking requested', 'Your new appointment has been submitted.')
      load()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create booking.')
    } finally {
      setIsActioning(false)
    }
  }, [rebookTarget, pickerDate, pickerSelectedTime, load])

  // Load available slots when picker date or active modal target changes
  const activePickerTarget = rebookTarget ?? rescheduleTarget
  useEffect(() => {
    if (!activePickerTarget) { setPickerSlots([]); return }
    setPickerSlotsLoading(true)
    setPickerSelectedTime(null)
    availabilityApi.getSlots(
      activePickerTarget.providerId,
      activePickerTarget.providerType,
      pickerDate,
      activePickerTarget.service?.duration,
    )
      .then((slots) => setPickerSlots(slots.filter((s) => s.available !== false)))
      .catch(() => setPickerSlots([]))
      .finally(() => setPickerSlotsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePickerTarget?.id, pickerDate])

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleTarget || !pickerDate || !pickerSelectedTime) {
      Alert.alert('Missing info', 'Pick a date and available time slot.')
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
      await bookingsApi.clientReschedule(rescheduleTarget.id, token, tokenType, pickerDate, pickerSelectedTime)
      setRescheduleTarget(null)
      load()
    } catch {
      Alert.alert('Error', 'Could not reschedule booking. Please try again.')
    } finally { setIsActioning(false) }
  }, [rescheduleTarget, pickerDate, pickerSelectedTime, load])

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity
            onPress={() => router.push('/worker/saved' as never)}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={22} color={theme.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/client-settings' as never)}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
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
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {activeTab === 'upcoming'  ? 'No upcoming bookings.' :
             activeTab === 'completed' ? 'No completed bookings yet.' :
                                         'No cancelled bookings.'}
          </Text>
          {activeTab === 'upcoming' && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)' as never)}
              style={[styles.ctaBtn, { backgroundColor: '#D85A30' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="compass-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 6 }}>Find a Professional</Text>
            </TouchableOpacity>
          )}
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
          <DateSlotPicker
            title={`Rebook ${rebookTarget?.service?.name ?? 'this service'}`}
            pickerDate={pickerDate}
            onDateChange={setPickerDate}
            pickerSelectedTime={pickerSelectedTime}
            onTimeSelect={setPickerSelectedTime}
            pickerSlots={pickerSlots}
            pickerSlotsLoading={pickerSlotsLoading}
            theme={theme}
          />
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
          <DateSlotPicker
            title="Pick a new date and time"
            pickerDate={pickerDate}
            onDateChange={setPickerDate}
            pickerSelectedTime={pickerSelectedTime}
            onTimeSelect={setPickerSelectedTime}
            pickerSlots={pickerSlots}
            pickerSlotsLoading={pickerSlotsLoading}
            theme={theme}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 13, color: '#6B6B6B', marginBottom: 10, marginTop: 16, paddingHorizontal: 16 },
  dateChip: {
    alignItems: 'center', justifyContent: 'center',
    width: 52, height: 60, borderRadius: 12, borderWidth: 1,
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
})
