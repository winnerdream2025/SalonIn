import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useProviderBookings } from '../../services/booking/booking.hooks'
import type { BookingResult, BookingStatus } from '../../services/booking/booking.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING_PAYMENT: '#F59E0B',
  PENDING:         '#F59E0B',
  CONFIRMED:       '#1D9E75',
  COMPLETED:       '#6366F1',
  CANCELLED:       '#E24B4A',
  NO_SHOW:         '#9CA3AF',
}

type CalendarView = 'month' | 'week' | 'day'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatTime12(t: string): string {
  if (t.includes('AM') || t.includes('PM')) return t
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor)
  start.setDate(anchor.getDate() - anchor.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// ─── Booking detail modal ─────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  onClose,
  theme,
}: {
  booking: BookingResult | null
  onClose: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  if (!booking) return null
  const color = STATUS_COLOR[booking.status]
  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.bg.elevated }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Appointment</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.detailRow, { borderColor: theme.border.subtle }]}>
            <Ionicons name="person-outline" size={16} color={theme.text.tertiary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, marginLeft: 8 }}>
              {booking.clientName}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderColor: theme.border.subtle }]}>
            <Ionicons name="cut-outline" size={16} color={theme.text.tertiary} />
            <Text style={{ fontSize: 14, color: theme.text.secondary, marginLeft: 8 }}>
              {booking.service?.name ?? 'Appointment'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderColor: theme.border.subtle }]}>
            <Ionicons name="time-outline" size={16} color={theme.text.tertiary} />
            <Text style={{ fontSize: 14, color: theme.text.secondary, marginLeft: 8 }}>
              {formatTime12(booking.startTime)}{booking.endTime ? ` – ${formatTime12(booking.endTime)}` : ''}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderColor: theme.border.subtle }]}>
            <Ionicons name="ellipse" size={12} color={color} />
            <Text style={{ fontSize: 13, fontWeight: '700', color, marginLeft: 8 }}>
              {booking.status.replace('_', ' ')}
            </Text>
          </View>
          {booking.confirmationCode ? (
            <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 8 }}>
              Ref: {booking.confirmationCode}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, bookingsByDate, today, onDayPress, theme,
}: {
  year: number; month: number; bookingsByDate: Record<string, BookingResult[]>
  today: string; onDayPress: (date: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const days = getDaysInMonth(year, month)
  const firstDow = days[0]?.getDay() ?? 0
  const blanks = Array.from({ length: firstDow })

  return (
    <View>
      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {DAYS_SHORT.map((d) => (
          <View key={d} style={styles.weekCell}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.tertiary, textAlign: 'center' }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {blanks.map((_, i) => <View key={`b${i}`} style={styles.dayCell} />)}
        {days.map((d) => {
          const key = isoDate(d)
          const bkgs = bookingsByDate[key] ?? []
          const isToday = key === today
          const hasBookings = bkgs.length > 0
          const dots = bkgs.slice(0, 3).map(b => STATUS_COLOR[b.status])

          return (
            <TouchableOpacity
              key={key}
              onPress={() => onDayPress(key)}
              style={[
                styles.dayCell,
                isToday && { backgroundColor: '#D85A3015' },
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.dayNum,
                isToday && { backgroundColor: '#D85A30' },
              ]}>
                <Text style={{
                  fontSize: 13, fontWeight: isToday ? '800' : '500',
                  color: isToday ? '#FFF' : theme.text.primary,
                  textAlign: 'center',
                }}>
                  {d.getDate()}
                </Text>
              </View>
              {hasBookings && (
                <View style={styles.dotsRow}>
                  {dots.map((c, i) => <View key={i} style={[styles.dot, { backgroundColor: c }]} />)}
                  {bkgs.length > 3 && (
                    <Text style={{ fontSize: 8, color: theme.text.tertiary }}>+{bkgs.length - 3}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  anchor, bookingsByDate, today, onBookingPress, theme,
}: {
  anchor: Date; bookingsByDate: Record<string, BookingResult[]>
  today: string; onBookingPress: (b: BookingResult) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const days = getWeekDays(anchor)

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {days.map((d) => {
        const key = isoDate(d)
        const bkgs = bookingsByDate[key] ?? []
        const isToday = key === today
        return (
          <View key={key} style={[styles.weekDayRow, { borderBottomColor: theme.border.subtle }]}>
            <View style={[styles.weekDayLabel, isToday && { backgroundColor: '#D85A3015' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: isToday ? '#D85A30' : theme.text.tertiary }}>
                {DAYS_SHORT[d.getDay()]}
              </Text>
              <View style={[styles.weekDayNum, isToday && { backgroundColor: '#D85A30' }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isToday ? '#FFF' : theme.text.primary }}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, padding: 8, gap: 4 }}>
              {bkgs.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.text.tertiary, fontStyle: 'italic', paddingVertical: 8 }}>Free</Text>
              ) : (
                bkgs.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => onBookingPress(b)}
                    style={[styles.weekBooking, { backgroundColor: STATUS_COLOR[b.status] + '22', borderLeftColor: STATUS_COLOR[b.status] }]}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: STATUS_COLOR[b.status] }}>
                      {formatTime12(b.startTime)}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.primary }}>
                      {b.clientName} · {b.service?.name ?? 'Appt'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  date: _date, bookings, onBookingPress, theme,
}: {
  date: string; bookings: BookingResult[]
  onBookingPress: (b: BookingResult) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 7) // 7 AM – 10 PM

  function bookingsAtHour(h: number): BookingResult[] {
    return bookings.filter((b) => {
      const bh = parseInt(b.startTime.split(':')[0] ?? '0', 10)
      return bh === h
    })
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {hours.map((h) => {
        const hBkgs = bookingsAtHour(h)
        const label = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
        return (
          <View key={h} style={[styles.hourRow, { borderBottomColor: theme.border.subtle }]}>
            <Text style={[styles.hourLabel, { color: theme.text.tertiary }]}>{label}</Text>
            <View style={{ flex: 1, paddingLeft: 12, gap: 4 }}>
              {hBkgs.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => onBookingPress(b)}
                  style={[styles.dayBooking, {
                    backgroundColor: STATUS_COLOR[b.status] + '18',
                    borderLeftColor: STATUS_COLOR[b.status],
                  }]}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: STATUS_COLOR[b.status] }}>
                    {formatTime12(b.startTime)}{b.endTime ? ` – ${formatTime12(b.endTime)}` : ''}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.primary, marginTop: 2 }}>
                    {b.clientName}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
                    {b.service?.name ?? 'Appointment'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProviderCalendarScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()

  const todayDate = new Date()
  const todayStr = isoDate(todayDate)

  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState<Date>(new Date(todayDate))
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [selectedBooking, setSelectedBooking] = useState<BookingResult | null>(null)

  const currentYear  = anchor.getFullYear()
  const currentMonth = anchor.getMonth()

  const { bookings, isLoading } = useProviderBookings({})

  const bookingsByDate = useMemo<Record<string, BookingResult[]>>(() => {
    const map: Record<string, BookingResult[]> = {}
    for (const b of bookings) {
      if (!map[b.date]) map[b.date] = []
      map[b.date]!.push(b)
    }
    return map
  }, [bookings])

  const handlePrev = useCallback(() => {
    const d = new Date(anchor)
    if (view === 'month') { d.setMonth(d.getMonth() - 1); d.setDate(1) }
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setAnchor(d)
  }, [anchor, view])

  const handleNext = useCallback(() => {
    const d = new Date(anchor)
    if (view === 'month') { d.setMonth(d.getMonth() + 1); d.setDate(1) }
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setAnchor(d)
  }, [anchor, view])

  const handleDayPress = useCallback((date: string) => {
    setSelectedDate(date)
    setView('day')
    setAnchor(new Date(`${date}T00:00:00`))
  }, [])

  const navTitle = view === 'month'
    ? `${MONTHS[currentMonth]} ${currentYear}`
    : view === 'week'
    ? (() => { const wk = getWeekDays(anchor); return `${MONTHS[wk[0]!.getMonth()].slice(0,3)} ${wk[0]!.getDate()} – ${wk[6]!.getDate()}` })()
    : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Calendar</Text>

        {/* View switcher */}
        <View style={styles.viewRow}>
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={[
                styles.viewChip,
                v === view
                  ? { backgroundColor: '#D85A30', borderColor: '#D85A30' }
                  : { backgroundColor: theme.bg.input, borderColor: theme.border.default },
              ]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: v === view ? '#FFF' : theme.text.secondary, textTransform: 'capitalize' }}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Navigation row */}
      <View style={[styles.navRow, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={handlePrev} style={styles.navBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={theme.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setAnchor(new Date(todayDate)); setSelectedDate(todayStr) }} activeOpacity={0.75}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>{navTitle}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.navBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-forward" size={20} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1,2,3].map(k => <Skeleton key={k} height={60} radius={12} />)}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {view === 'month' && (
            <>
              <MonthView
                year={currentYear} month={currentMonth}
                bookingsByDate={bookingsByDate} today={todayStr}
                onDayPress={handleDayPress} theme={theme}
              />
              {/* Selected day bookings */}
              {(bookingsByDate[selectedDate] ?? []).length > 0 && (
                <View style={{ flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.secondary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  <FlatList
                    data={bookingsByDate[selectedDate] ?? []}
                    keyExtractor={(b) => b.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
                    renderItem={({ item: b }) => (
                      <TouchableOpacity
                        onPress={() => setSelectedBooking(b)}
                        style={[styles.listBooking, { backgroundColor: STATUS_COLOR[b.status] + '18', borderLeftColor: STATUS_COLOR[b.status] }]}
                        activeOpacity={0.75}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: STATUS_COLOR[b.status] }}>
                          {formatTime12(b.startTime)}{b.endTime ? ` – ${formatTime12(b.endTime)}` : ''}
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.text.primary }}>{b.clientName} · {b.service?.name ?? 'Appt'}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </>
          )}

          {view === 'week' && (
            <WeekView
              anchor={anchor} bookingsByDate={bookingsByDate} today={todayStr}
              onBookingPress={setSelectedBooking} theme={theme}
            />
          )}

          {view === 'day' && (
            <DayView
              date={selectedDate}
              bookings={bookingsByDate[selectedDate] ?? []}
              onBookingPress={setSelectedBooking} theme={theme}
            />
          )}
        </View>
      )}

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        theme={theme}
      />
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
  viewRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  viewChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    padding: 6,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  dayCell: {
    width: `${100 / 7}%` as `${number}%`,
    minHeight: 52,
    padding: 2,
    alignItems: 'center',
    borderRadius: 8,
  },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  weekDayRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  weekDayLabel: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  weekDayNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weekBooking: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hourRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  hourLabel: {
    width: 52,
    fontSize: 11,
    fontWeight: '600',
    paddingTop: 2,
  },
  dayBooking: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  listBooking: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
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
    paddingBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
