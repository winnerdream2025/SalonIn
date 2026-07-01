import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useAvailabilitySlots } from '../../services/booking/booking.hooks'
import { bookingsApi, intakeFormsApi } from '../../services/booking/booking.api'
import { useAuthStore } from '../../store/authStore'
import type { AvailabilitySlot } from '../../services/booking/booking.types'

const SCREEN_W = Dimensions.get('window').width
const DAY_CELL = Math.floor((SCREEN_W - 32) / 7)

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (string | null)[][] = []
  let week: (string | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(toISO(year, month, d))
    if (week.length === 7) { grid.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}

function formatTime12(hhmm: string): string {
  const [hStr = '0', mStr = '00'] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

function formatDurationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function formatPrice(price: number, currency: string): string {
  if (price <= 0) return 'Free'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(price) + '+'
}

export default function BookingSlotScreen() {
  const {
    providerId,
    providerType,
    serviceId,
    serviceName,
    servicePrice,
    serviceCurrency,
    serviceDuration,
    providerName,
  } = useLocalSearchParams<{
    providerId: string
    providerType: string
    serviceId: string
    serviceName: string
    servicePrice: string
    serviceCurrency: string
    serviceDuration: string
    providerName: string
  }>()

  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const todayDate = new Date()
  const [viewYear, setViewYear] = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_ISO)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handlePrevMonth = useCallback(() => {
    const now = new Date()
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }, [viewYear, viewMonth])

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }, [viewMonth])

  // Waitlist sheet state
  const [waitlistOpen,  setWaitlistOpen]  = useState(false)
  const [waitlistName,  setWaitlistName]  = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState((user as any)?.email ?? '')
  const [waitlistPhone, setWaitlistPhone] = useState('')
  const [waitlistTime,  setWaitlistTime]  = useState('09:00')
  const [waitlistBusy,  setWaitlistBusy]  = useState(false)

  const handleJoinWaitlist = useCallback(async () => {
    if (!waitlistName.trim() || !waitlistEmail.trim()) {
      Alert.alert('Required', 'Please enter your name and email.')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(waitlistTime.trim())) {
      Alert.alert('Invalid time', 'Enter preferred start time as HH:MM (e.g. 14:00)')
      return
    }
    setWaitlistBusy(true)
    try {
      await bookingsApi.joinWaitlist({
        providerId: providerId ?? '',
        providerType: providerType ?? 'professional',
        serviceId: serviceId ?? '',
        date: selectedDate,
        startTime: waitlistTime.trim(),
        clientName: waitlistName.trim(),
        clientEmail: waitlistEmail.trim(),
        clientPhone: waitlistPhone.trim() || undefined,
      })
      setWaitlistOpen(false)
      Alert.alert("You're on the list", "We'll notify you when a slot opens up.")
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not join waitlist.')
    } finally {
      setWaitlistBusy(false)
    }
  }, [providerId, providerType, serviceId, selectedDate, waitlistName, waitlistEmail, waitlistPhone, waitlistTime])

  const { slots, isLoading } = useAvailabilitySlots(
    providerId ?? null,
    providerType ?? 'professional',
    selectedDate,
    parseInt(serviceDuration ?? '60', 10),
  )

  const availableSlots = slots.filter((s) => s.available !== false)

  const handleContinue = useCallback(
    async (slot: AvailabilitySlot) => {
      const baseParams = {
        providerId,
        providerType: providerType ?? 'professional',
        serviceId,
        serviceName,
        servicePrice,
        serviceCurrency,
        serviceDuration,
        date: selectedDate,
        startTime: slot.time,
        providerName: providerName ?? '',
      }

      let intakeForm = null
      try {
        const forms = await intakeFormsApi.forProvider(providerId ?? '', providerType ?? 'professional')
        intakeForm = forms.find(
          (f) => f.serviceIds.length === 0 || f.serviceIds.includes(serviceId ?? ''),
        ) ?? null
      } catch { /* non-fatal */ }

      if (intakeForm) {
        router.push({ pathname: '/booking/intake', params: { ...baseParams, intakeFormRaw: JSON.stringify(intakeForm) } } as never)
      } else {
        router.push({ pathname: '/booking/confirm', params: baseParams } as never)
      }
    },
    [providerId, providerType, serviceId, serviceName, servicePrice, serviceCurrency, serviceDuration, selectedDate, providerName],
  )

  const handleSelectSlot = useCallback((slot: AvailabilitySlot) => {
    setSelectedSlot(slot)
  }, [])

  const durationMins = parseInt(serviceDuration ?? '60', 10)

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header — "← Select Date & Time" (Booksy style) */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary, textAlign: 'center', marginHorizontal: 12 }}>
          Select Date & Time
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: (selectedSlot ? 100 : 24) + bottom }} showsVerticalScrollIndicator={false}>

        {/* ── Month calendar ── */}
        <View style={styles.calendar}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>{monthLabel}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                activeOpacity={0.75}
                style={[styles.monthNavBtn, { borderColor: theme.border.default, opacity: (viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth()) ? 0.3 : 1 }]}
              >
                <Ionicons name="chevron-back" size={16} color={theme.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                activeOpacity={0.75}
                style={[styles.monthNavBtn, { borderColor: theme.border.default }]}
              >
                <Ionicons name="chevron-forward" size={16} color={theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[styles.weekdayLabel, { color: theme.text.tertiary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          {monthGrid.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((iso, di) => {
                if (!iso) return <View key={di} style={styles.dayCell} />
                const isPast = iso < TODAY_ISO
                const isToday = iso === TODAY_ISO
                const isSelected = iso === selectedDate
                return (
                  <TouchableOpacity
                    key={iso}
                    onPress={() => { if (!isPast) { setSelectedDate(iso); setSelectedSlot(null) } }}
                    activeOpacity={isPast ? 1 : 0.75}
                    style={styles.dayCell}
                  >
                    <View style={[
                      styles.dayCircle,
                      isSelected && { backgroundColor: '#D85A30' },
                      !isSelected && isToday && { borderWidth: 1.5, borderColor: '#D85A30' },
                    ]}>
                      <Text style={[
                        styles.dayNumber,
                        { color: isPast ? theme.text.tertiary : isSelected ? '#fff' : isToday ? '#D85A30' : theme.text.primary },
                        isPast && styles.dayStrike,
                      ]}>
                        {new Date(`${iso}T00:00:00`).getDate()}
                      </Text>
                    </View>
                    {isToday && !isSelected && (
                      <View style={[styles.todayDot, { backgroundColor: '#D85A30' }]} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        {/* ── Time slot pills ── */}
        <View style={{ paddingTop: 16 }}>
          {isLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {[1,2,3,4].map((k) => <Skeleton key={k} width={90} height={44} radius={22} />)}
            </ScrollView>
          ) : availableSlots.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
              <Ionicons name="calendar-outline" size={32} color={theme.text.tertiary} />
              <Text style={{ color: theme.text.secondary, textAlign: 'center', fontSize: 14 }}>
                No available slots on this day
              </Text>
              <TouchableOpacity
                onPress={() => setWaitlistOpen(true)}
                activeOpacity={0.8}
                style={[styles.waitlistBtn, { backgroundColor: theme.bg.surface, borderColor: '#D85A3050' }]}
              >
                <Ionicons name="notifications-outline" size={15} color="#D85A30" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#D85A30', marginLeft: 6 }}>
                  Notify me of cancellations
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {availableSlots.map((slot, i) => {
                const active = selectedSlot?.time === slot.time
                return (
                  <TouchableOpacity
                    key={`${selectedDate}-${slot.time}-${i}`}
                    onPress={() => handleSelectSlot(slot)}
                    activeOpacity={0.75}
                    style={[
                      styles.slotPill,
                      {
                        backgroundColor: active ? '#D85A30' : theme.bg.surface,
                        borderColor: active ? '#D85A30' : theme.border.default,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : theme.text.primary }}>
                      {formatTime12(slot.time)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}
        </View>

        {/* Service summary card (visible when slot selected) */}
        {selectedSlot && (
          <View style={[styles.summaryCard, { backgroundColor: theme.bg.surface }]}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary, flex: 1 }} numberOfLines={1}>
              {serviceName}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
                {formatPrice(parseFloat(servicePrice ?? '0'), serviceCurrency ?? 'USD')}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary }}>
                {formatTime12(selectedSlot.time)} – {formatDurationLabel(durationMins)}
              </Text>
            </View>
          </View>
        )}

        {/* Message pro link */}
        <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, color: theme.text.tertiary }}>
            Need to book ASAP?{' '}
            <Text
              style={{ color: '#D85A30', fontWeight: '700', textDecorationLine: 'underline' }}
              onPress={() => router.back()}
            >
              Message your pro
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky bottom: 1 service • duration / price / [Continue] ── */}
      {selectedSlot && (
        <View style={[styles.stickyBar, { backgroundColor: theme.bg.base, borderTopColor: theme.border.subtle, paddingBottom: Math.max(bottom, 16) }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: theme.text.tertiary }}>
              1 service • {formatDurationLabel(durationMins)}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, marginTop: 2 }}>
              {formatPrice(parseFloat(servicePrice ?? '0'), serviceCurrency ?? 'USD')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void handleContinue(selectedSlot)}
            activeOpacity={0.85}
            style={styles.continueBtn}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waitlist sheet */}
      <Modal
        visible={waitlistOpen}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setWaitlistOpen(false)}
      >
        <View style={[styles.sheetRoot, { backgroundColor: theme.bg.base }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={() => setWaitlistOpen(false)}>
              <Text style={{ color: theme.text.secondary, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Join Waitlist</Text>
            <TouchableOpacity onPress={handleJoinWaitlist} disabled={waitlistBusy}>
              {waitlistBusy
                ? <ActivityIndicator size="small" color="#D85A30" />
                : <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '700' }}>Submit</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 20 }}>
              We'll notify you by push notification when a slot opens for {serviceName} on {selectedDate}.
            </Text>
            <TextInput
              value={waitlistName}
              onChangeText={setWaitlistName}
              placeholder="Your name"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.sheetInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
            />
            <TextInput
              value={waitlistEmail}
              onChangeText={setWaitlistEmail}
              placeholder="Email address"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.sheetInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
            />
            <TextInput
              value={waitlistPhone}
              onChangeText={setWaitlistPhone}
              placeholder="Phone (optional)"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="phone-pad"
              style={[styles.sheetInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
            />
            <TextInput
              value={waitlistTime}
              onChangeText={setWaitlistTime}
              placeholder="Preferred start time  e.g. 14:00"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="numbers-and-punctuation"
              style={[styles.sheetInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
            />
          </ScrollView>
        </View>
      </Modal>
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
  // ── Calendar ──────────────────────────────────────────────────────────────
  calendar: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    width: DAY_CELL,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    width: DAY_CELL,
    height: DAY_CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: DAY_CELL - 8,
    height: DAY_CELL - 8,
    borderRadius: (DAY_CELL - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayStrike: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
  },
  // ── Slot pills ────────────────────────────────────────────────────────────
  slotPill: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  // ── Sticky bottom bar ─────────────────────────────────────────────────────
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  continueBtn: {
    backgroundColor: '#2196A8',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Waitlist ──────────────────────────────────────────────────────────────
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
})
