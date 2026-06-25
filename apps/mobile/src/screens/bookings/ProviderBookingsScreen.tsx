import React, { useState, useEffect, useCallback } from 'react'
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
import { workersApi, salonsApi } from '@salonin/api-client'
import { Role } from '@salonin/types'
import { useAuthStore } from '../../store/authStore'
import {
  useProviderBookings,
  useProviderBookingActions,
  useProviderProfile,
} from '../../services/booking/booking.hooks'
import type { ProviderBookingItem } from '../../services/booking/booking.types'
import type { BookingProviderType } from '@salonin/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ProviderTab = 'new' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_FOR_TAB: Record<ProviderTab, ProviderBookingItem['status'][]> = {
  new:       ['pending_payment'],
  confirmed: ['confirmed'],
  completed: ['completed', 'rescheduled'],
  cancelled: ['cancelled', 'no-show'],
}

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

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
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
  booking: ProviderBookingItem | null
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

// ─── Booking card ─────────────────────────────────────────────────────────────

function ProviderBookingCard({
  item,
  tab,
  onConfirm,
  onCancel,
  onReschedule,
  onMessage,
  theme,
}: {
  item: ProviderBookingItem
  tab: ProviderTab
  onConfirm: (b: ProviderBookingItem) => void
  onCancel: (b: ProviderBookingItem) => void
  onReschedule: (b: ProviderBookingItem) => void
  onMessage: (b: ProviderBookingItem) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const isActionable = tab === 'new' || tab === 'confirmed'

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
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#D85A30' }}>
          {item.price > 0 ? formatPrice(item.price, item.currency ?? 'USD') : 'Free'}
        </Text>
      </View>

      {/* Service / date */}
      <View style={[styles.infoBlock, { borderTopColor: theme.border.subtle }]}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {item.serviceName}
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
      </View>

      {/* Actions */}
      {isActionable && (
        <View style={styles.actionRow}>
          {tab === 'new' && (
            <TouchableOpacity
              onPress={() => onConfirm(item)}
              style={[styles.actionBtn, { backgroundColor: 'rgba(29,158,117,0.12)', borderColor: '#1D9E75' }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D9E75' }}>Confirm</Text>
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
            onPress={() => onMessage(item)}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubble-outline" size={14} color={theme.text.secondary} />
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
  active: ProviderTab
  onSelect: (t: ProviderTab) => void
  counts: Record<ProviderTab, number>
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const tabs: { key: ProviderTab; label: string }[] = [
    { key: 'new',       label: 'New' },
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
}

// ─── Inner screen (knows tenantSlug) ─────────────────────────────────────────

function ProviderBookingsInner({
  tenantSlug,
  providerEmail,
  providerPassword,
  theme,
  bottom,
}: {
  tenantSlug: string
  providerEmail: string | null
  providerPassword: string | null
  theme: ReturnType<typeof useTheme>['theme']
  bottom: number
}) {
  const [activeTab, setActiveTab] = useState<ProviderTab>('new')
  const [rescheduleTarget, setRescheduleTarget] = useState<ProviderBookingItem | null>(null)

  const { bookings, isLoading, error, refetch } = useProviderBookings(tenantSlug, providerEmail, providerPassword)
  const { confirm, cancel, reschedule, isWorking } = useProviderBookingActions(tenantSlug, providerEmail, providerPassword)

  const byTab = (tab: ProviderTab) =>
    bookings.filter((b) => STATUS_FOR_TAB[tab].includes(b.status))

  const counts: Record<ProviderTab, number> = {
    new:       byTab('new').length,
    confirmed: byTab('confirmed').length,
    completed: byTab('completed').length,
    cancelled: byTab('cancelled').length,
  }

  const filtered = byTab(activeTab)

  const handleConfirm = useCallback(async (b: ProviderBookingItem) => {
    const result = await confirm(b.bookingId)
    if (result) refetch()
  }, [confirm, refetch])

  const handleCancel = useCallback((b: ProviderBookingItem) => {
    Alert.alert('Cancel Booking', `Cancel ${b.clientName}'s ${b.serviceName}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          const result = await cancel(b.bookingId)
          if (result) refetch()
        },
      },
    ])
  }, [cancel, refetch])

  const handleReschedule = useCallback((b: ProviderBookingItem) => {
    setRescheduleTarget(b)
  }, [])

  const handleRescheduleConfirm = useCallback(async (date: string, time: string) => {
    if (!rescheduleTarget) return
    const result = await reschedule(rescheduleTarget.bookingId, date, time)
    if (result) {
      setRescheduleTarget(null)
      refetch()
    }
  }, [rescheduleTarget, reschedule, refetch])

  const handleMessage = useCallback((_b: ProviderBookingItem) => {
    router.push('/inbox' as never)
  }, [])

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
        <TouchableOpacity
          onPress={refetch}
          style={[styles.retryBtn, { borderColor: theme.border.default }]}
          activeOpacity={0.75}
        >
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      <TabBar active={activeTab} onSelect={setActiveTab} counts={counts} theme={theme} />

      {filtered.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12 }}>
            {activeTab === 'new'
              ? 'No new bookings.'
              : activeTab === 'confirmed'
              ? 'No confirmed bookings.'
              : activeTab === 'completed'
              ? 'No completed bookings yet.'
              : 'No cancelled bookings.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.bookingId}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.text.tertiary} />
          }
          renderItem={({ item }) => (
            <ProviderBookingCard
              item={item}
              tab={activeTab}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
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
        isWorking={isWorking}
        theme={theme}
      />
    </>
  )
}

// ─── Resolver wrapper ─────────────────────────────────────────────────────────

function ProviderBookingsResolver({
  theme,
  bottom,
}: {
  theme: ReturnType<typeof useTheme>['theme']
  bottom: number
}) {
  const currentUser = useAuthStore((s) => s.user)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [providerType, setProviderType] = useState<BookingProviderType>('professional')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const isWorker = currentUser.role === Role.WORKER
    const fetchMe = isWorker
      ? workersApi.getMe().then((p) => ({ id: p.id, type: 'professional' as BookingProviderType }))
      : salonsApi.getMe().then((p) => ({ id: p.id, type: 'salon' as BookingProviderType }))

    fetchMe
      .then(({ id, type }) => {
        setProfileId(id)
        setProviderType(type)
      })
      .catch((e: unknown) => {
        setProfileError(e instanceof Error ? e.message : 'Could not load profile')
      })
      .finally(() => setLoadingProfile(false))
  }, [currentUser])

  const { tenantSlug, providerEmail, providerPassword, isLoading: isResolvingSlug, error: slugError } = useProviderProfile(
    profileId ?? undefined,
    providerType,
  )

  if (loadingProfile || isResolvingSlug) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        {[1, 2, 3].map((k) => <Skeleton key={k} height={140} radius={16} />)}
      </View>
    )
  }

  const resolveError = profileError ?? slugError
  if (resolveError) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
        <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>{resolveError}</Text>
      </View>
    )
  }

  if (!tenantSlug) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="link-outline" size={40} color={theme.text.tertiary} />
        <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center', fontSize: 15 }}>
          No booking profile connected.
        </Text>
        <Text style={{ color: theme.text.tertiary, marginTop: 8, textAlign: 'center', fontSize: 13 }}>
          Enable bookings in your profile settings to start receiving appointments.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/worker/edit' as never)}
          style={[styles.retryBtn, { borderColor: '#D85A30' }]}
          activeOpacity={0.75}
        >
          <Text style={{ fontWeight: '700', color: '#D85A30' }}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return <ProviderBookingsInner tenantSlug={tenantSlug} providerEmail={providerEmail} providerPassword={providerPassword} theme={theme} bottom={bottom} />
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
      <ProviderBookingsResolver theme={theme} bottom={bottom} />
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
})
