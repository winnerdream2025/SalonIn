import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useAvailabilitySlots } from '../../services/booking/booking.hooks'
import type { AvailabilitySlot } from '../../services/booking/booking.types'

// Generate the next 14 days for the date strip
function buildDateRange(): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const DATE_RANGE = buildDateRange()

function formatDateLabel(iso: string): { day: string; weekday: string } {
  const d = new Date(`${iso}T00:00:00`)
  return {
    day: d.getDate().toString(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  }
}

function formatTime12(hhmm: string): string {
  const [hStr = '0', mStr = '00'] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
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

  const [selectedDate, setSelectedDate] = useState<string>(DATE_RANGE[0] ?? '')

  const { slots, isLoading } = useAvailabilitySlots(
    providerId ?? null,
    providerType ?? 'professional',
    selectedDate,
    parseInt(serviceDuration ?? '60', 10),
  )

  const availableSlots = slots.filter((s) => s.available !== false)

  const handleSelectSlot = useCallback(
    (slot: AvailabilitySlot) => {
      router.push({
        pathname: '/booking/confirm',
        params: {
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
        },
      } as never)
    },
    [providerId, providerType, serviceId, serviceName, servicePrice, serviceCurrency, serviceDuration, selectedDate, providerName],
  )

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
            Pick a Time
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>
            {serviceName}
          </Text>
        </View>
      </View>

      {/* Date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {DATE_RANGE.map((date) => {
          const { day, weekday } = formatDateLabel(date)
          const active = date === selectedDate
          return (
            <TouchableOpacity
              key={date}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.75}
              style={[
                styles.dateChip,
                {
                  backgroundColor: active ? '#D85A30' : theme.bg.surface,
                  borderColor: active ? '#D85A30' : theme.border.default,
                },
              ]}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.tertiary }}>
                {weekday.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: active ? '#FFFFFF' : theme.text.primary }}>
                {day}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Slots */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} height={52} radius={12} />
          ))}
        </View>
      ) : availableSlots.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={36} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 10 }}>No available slots on this day.</Text>
        </View>
      ) : (
        <FlatList
          data={availableSlots}
          keyExtractor={(item, i) => `${selectedDate}-${item.time}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelectSlot(item)}
              activeOpacity={0.75}
              style={[styles.slotRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
                {formatTime12(item.time)}
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.text.tertiary}
              />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
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
  dateChip: {
    width: 52,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
})
