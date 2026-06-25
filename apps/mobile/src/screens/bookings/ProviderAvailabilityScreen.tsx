import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useProviderProfile, useAvailabilityHours } from '../../services/booking/booking.hooks'
import type { AvailabilityHours, DayHours } from '../../services/booking/booking.types'
import { useAuthStore } from '../../store/authStore'
import type { BookingProviderType } from '@salonin/types'

const DAYS: { key: keyof AvailabilityHours; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
]

const TIME_SLOTS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
TIME_SLOTS.push('23:00')

function formatTime(t: string): string {
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${suffix}`
}

const DEFAULT_HOURS: AvailabilityHours = {
  monday:    { isOpen: true,  start: '09:00', end: '18:00' },
  tuesday:   { isOpen: true,  start: '09:00', end: '18:00' },
  wednesday: { isOpen: true,  start: '09:00', end: '18:00' },
  thursday:  { isOpen: true,  start: '09:00', end: '18:00' },
  friday:    { isOpen: true,  start: '09:00', end: '18:00' },
  saturday:  { isOpen: false, start: '10:00', end: '16:00' },
  sunday:    { isOpen: false, start: '10:00', end: '16:00' },
}

function TimePickerRow({
  label,
  value,
  onChange,
  theme,
}: {
  label: string
  value: string
  onChange: (t: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={[styles.timePicker, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{formatTime(value)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.text.tertiary} />
      </TouchableOpacity>
      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.timeScroll, { backgroundColor: theme.bg.elevated }]}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {TIME_SLOTS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { onChange(t); setOpen(false) }}
              style={[styles.timeChip, { backgroundColor: t === value ? '#D85A30' : theme.bg.surface, borderColor: t === value ? '#D85A30' : theme.border.default }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: t === value ? '#fff' : theme.text.secondary }}>
                {formatTime(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

export default function ProviderAvailabilityScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const { user } = useAuthStore()

  const providerType: BookingProviderType = (user as any)?.role === 'SALON' ? 'salon' : 'professional'
  const providerId = (user as any)?.profileId ?? user?.id ?? ''

  const { tenantSlug, providerEmail, providerPassword } = useProviderProfile(providerId, providerType)
  const { hours, isLoading, isSaving, error, save } = useAvailabilityHours(tenantSlug, providerEmail, providerPassword)

  const [local, setLocal] = useState<AvailabilityHours>(DEFAULT_HOURS)

  useEffect(() => {
    if (hours) setLocal(hours)
  }, [hours])

  const setDay = (day: keyof AvailabilityHours, patch: Partial<DayHours>) => {
    setLocal((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  const handleSave = async () => {
    const ok = await save(local)
    if (ok) {
      Alert.alert('Saved', 'Your booking hours have been updated.')
    } else if (error) {
      Alert.alert('Not available yet', 'Working hours sync is coming soon. Your SalonIn schedule has been saved separately.')
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Booking Hours</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#D85A30" />
            : <Text style={{ fontSize: 15, fontWeight: '700', color: '#D85A30' }}>Save</Text>}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D85A30" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 20, lineHeight: 18 }}>
            Set the days and hours clients can book appointments with you.
          </Text>

          {DAYS.map(({ key, label }) => {
            const day = local[key]
            return (
              <View
                key={key}
                style={[styles.dayCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle, opacity: day.isOpen ? 1 : 0.65 }]}
              >
                <View style={styles.dayRow}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, flex: 1 }}>{label}</Text>
                  <Text style={{ fontSize: 13, color: day.isOpen ? '#1D9E75' : theme.text.tertiary, marginRight: 10 }}>
                    {day.isOpen ? 'Open' : 'Closed'}
                  </Text>
                  <Switch
                    value={day.isOpen}
                    onValueChange={(v) => setDay(key, { isOpen: v })}
                    trackColor={{ false: '#ccc', true: '#D85A30' }}
                    thumbColor="#fff"
                  />
                </View>
                {day.isOpen && (
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <TimePickerRow
                        label="Opens"
                        value={day.start}
                        onChange={(t) => setDay(key, { start: t })}
                        theme={theme}
                      />
                    </View>
                    <View style={styles.timeSep}>
                      <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>→</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimePickerRow
                        label="Closes"
                        value={day.end}
                        onChange={(t) => setDay(key, { end: t })}
                        theme={theme}
                      />
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: bottom + 16, borderTopColor: theme.border.subtle, backgroundColor: theme.bg.base }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { opacity: isSaving ? 0.6 : 1 }]}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Booking Hours</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, gap: 8 },
  timeSep: { paddingTop: 20, alignItems: 'center' },
  timePicker: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  timeScroll: { borderRadius: 8, marginTop: 4, paddingVertical: 6, maxHeight: 48 },
  timeChip: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    marginHorizontal: 3,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    backgroundColor: '#D85A30', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
})
