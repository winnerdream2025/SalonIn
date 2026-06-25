import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@salonin/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ALL_SPECIALTIES } from '@salonin/config'
import { Ionicons } from '@expo/vector-icons'
import { RadiusPickerSheet } from './RadiusPickerSheet'
import { useLocationStore } from '../store/locationStore'

export interface WorkerFilters {
  availability: string | null
  specialty: string | null
  /** Only show professionals who accept online bookings. */
  bookable: boolean
  /** Only show professionals who offer freelance / independent work. */
  freelance: boolean
}

export const EMPTY_WORKER_FILTERS: WorkerFilters = {
  availability: null,
  specialty: null,
  bookable: false,
  freelance: false,
}

const AVAILABILITIES = [
  { value: null, label: 'All' },
  { value: 'NOW', label: 'Available Now' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEKEND', label: 'Weekend' },
] as const

const SPECIALTIES = [
  { value: null, label: 'All' },
  ...ALL_SPECIALTIES.map((s) => ({ value: s.id, label: s.label })),
]

interface Props {
  visible: boolean
  onClose: () => void
  filters: WorkerFilters
  onApply: (filters: WorkerFilters) => void
}

export function WorkerFilterModal({ visible, onClose, filters, onApply }: Props) {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const [draft, setDraft] = useState<WorkerFilters>(filters)

  const activeCount = [draft.availability, draft.specialty, draft.bookable || null, draft.freelance || null].filter(Boolean).length
  const radiusMiles = useLocationStore((s) => s.radiusMiles)
  const [showRadius, setShowRadius] = useState(false)

  const handleApply = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onApply(draft)
    onClose()
  }, [draft, onApply, onClose])

  const handleClear = useCallback(() => {
    setDraft({ availability: null, specialty: null, bookable: false, freelance: false })
  }, [])

  return (
    <Modal
      visible={visible}
      transparent={Platform.OS !== 'ios'}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
      onShow={() => setDraft(filters)}
    >
      <View style={[s.overlay, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[s.sheet, { backgroundColor: theme.bg.surface }]}>
          <View style={[s.handle, { backgroundColor: theme.border.default }]} />

          <View style={s.header}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
              Filter Workers
            </Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={{ fontSize: 14, color: theme.brand.primary, fontWeight: '600' }}>Clear all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: bottom + 80 }}>
            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Availability</Text>
            <View style={s.optionsRow}>
              {AVAILABILITIES.map((o) => {
                const active = draft.availability === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, availability: o.value }))
                    }}
                    style={[
                      s.optionPill,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                        borderColor: active ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Specialty</Text>
            <View style={s.optionsRow}>
              {SPECIALTIES.map((o) => {
                const active = draft.specialty === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, specialty: o.value }))
                    }}
                    style={[
                      s.optionPill,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                        borderColor: active ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Options</Text>
            <View style={s.optionsRow}>
              {[
                { key: 'bookable' as const, label: 'Bookable online' },
                { key: 'freelance' as const, label: 'Freelance' },
              ].map((o) => {
                const active = draft[o.key]
                return (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, [o.key]: !d[o.key] }))
                    }}
                    style={[
                      s.optionPill,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                        borderColor: active ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Distance</Text>
            <TouchableOpacity
              onPress={() => setShowRadius(true)}
              style={[s.radiusRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{radiusMiles} mi</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
            <RadiusPickerSheet visible={showRadius} onClose={() => setShowRadius(false)} />
          </ScrollView>

          <View style={[s.footer, { paddingBottom: Math.max(bottom, 16) }]}>
            <TouchableOpacity
              onPress={handleApply}
              style={[s.applyBtn, { backgroundColor: theme.brand.primary }]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                Apply filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function activeWorkerFilterCount(f: WorkerFilters): number {
  return [f.availability, f.specialty, f.bookable || null, f.freelance || null].filter(Boolean).length
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  optionPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  applyBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
