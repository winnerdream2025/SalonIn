import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import type { BookingResult, BookingStatus } from '../../services/booking/booking.types'

export function formatBookingDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime12(t: string): string {
  if (!t || t.includes('AM') || t.includes('PM')) return t ?? ''
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

export function formatBookingPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

export function bookingStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'CONFIRMED':       return '#1D9E75'
    case 'PENDING':         return '#EF9F27'
    case 'PENDING_PAYMENT': return '#EF9F27'
    case 'CANCELLED':       return '#E24B4A'
    case 'COMPLETED':       return '#6B6B6B'
    case 'NO_SHOW':         return '#6B6B6B'
    default:                return '#6B6B6B'
  }
}

export function bookingStatusLabel(status: BookingStatus): string {
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

export type BookingCardRole = 'client' | 'provider'

type BookingTab = 'upcoming' | 'completed' | 'cancelled'

function classifyStatus(status: BookingStatus): BookingTab {
  if (status === 'PENDING' || status === 'CONFIRMED' || status === 'PENDING_PAYMENT') return 'upcoming'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'cancelled'
  return 'completed'
}

interface BookingCardProps {
  item: BookingResult
  role: BookingCardRole
  onPress?: (item: BookingResult) => void
  onMessage?: (item: BookingResult) => void
  onCancel?: (item: BookingResult) => void
  onReschedule?: (item: BookingResult) => void
  onRebook?: (item: BookingResult) => void
  onReview?: (item: BookingResult) => void
  onConfirm?: (item: BookingResult) => void
  theme?: ReturnType<typeof useTheme>['theme']
}

export function BookingCard({
  item,
  role,
  onPress,
  onMessage,
  onCancel,
  onReschedule,
  onRebook,
  onReview,
  onConfirm,
  theme: themeProp,
}: BookingCardProps) {
  const { theme: themeCtx } = useTheme()
  const theme = themeProp ?? themeCtx

  const tab = classifyStatus(item.status)
  const isUpcoming = tab === 'upcoming'
  const isCompleted = tab === 'completed'
  const color = bookingStatusColor(item.status)

  const nameLabel = role === 'provider' ? item.clientName : (item.service?.name ?? 'Appointment')
  const subLabel = role === 'provider' ? (item.service?.name ?? '') : ''

  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary }}>
            {nameLabel}
          </Text>
          {subLabel ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>
              {subLabel}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color }}>{bookingStatusLabel(item.status).toUpperCase()}</Text>
        </View>
      </View>

      {/* Date / time / price */}
      <View style={[styles.infoRow, { borderTopColor: theme.border.subtle }]}>
        <Ionicons name="calendar-outline" size={13} color={theme.text.tertiary} />
        <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 5 }}>
          {formatBookingDate(item.date)} · {formatTime12(item.startTime)}
          {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#D85A30' }}>
          {item.price > 0 ? formatBookingPrice(item.price, item.currency) : 'Free'}
        </Text>
      </View>

      {item.confirmationCode ? (
        <Text style={{ fontSize: 11, color: theme.text.tertiary }}>
          Ref: {item.confirmationCode}
        </Text>
      ) : null}

      {/* Actions — client upcoming */}
      {role === 'client' && isUpcoming && (
        <View style={styles.actions}>
          {onMessage && (
            <TouchableOpacity onPress={() => onMessage(item)} style={[styles.actionBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>Message</Text>
            </TouchableOpacity>
          )}
          {onReschedule && (
            <TouchableOpacity onPress={() => onReschedule(item)} style={[styles.actionBtn, { borderColor: '#EF9F2740' }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF9F27' }}>Reschedule</Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity onPress={() => onCancel(item)} style={[styles.actionBtn, { borderColor: '#E24B4A30' }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#E24B4A' }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actions — client completed */}
      {role === 'client' && isCompleted && (
        <View style={styles.actions}>
          {onReview && (
            <TouchableOpacity onPress={() => onReview(item)} style={[styles.actionBtn, { borderColor: '#EF9F2740', flex: 1 }]} activeOpacity={0.75}>
              <Ionicons name="star-outline" size={12} color="#EF9F27" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF9F27' }}>Leave Review</Text>
            </TouchableOpacity>
          )}
          {onRebook && (
            <TouchableOpacity onPress={() => onRebook(item)} style={[styles.actionBtn, { borderColor: '#D85A3040', flex: 1 }]} activeOpacity={0.75}>
              <Ionicons name="refresh-outline" size={12} color="#D85A30" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#D85A30' }}>Book Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actions — provider pending */}
      {role === 'provider' && item.status === 'PENDING' && (
        <View style={styles.actions}>
          {onConfirm && (
            <TouchableOpacity onPress={() => onConfirm(item)} style={[styles.actionBtn, { backgroundColor: '#1D9E75', borderColor: '#1D9E75', flex: 1 }]} activeOpacity={0.8}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Confirm</Text>
            </TouchableOpacity>
          )}
          {onMessage && (
            <TouchableOpacity onPress={() => onMessage(item)} style={[styles.actionBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>Message</Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity onPress={() => onCancel(item)} style={[styles.actionBtn, { borderColor: '#E24B4A30' }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#E24B4A' }}>Decline</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
})
