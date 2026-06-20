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

export interface JobFilters {
  employmentType: string | null
  payType: string | null
  distance: number | null
  status: string | null
}

export const EMPTY_JOB_FILTERS: JobFilters = {
  employmentType: null,
  payType: null,
  distance: null,
  status: null,
}

const EMPLOYMENT_TYPES = [
  { value: null,            label: 'All'           },
  { value: 'FULL_TIME',    label: 'Full-time'      },
  { value: 'PART_TIME',    label: 'Part-time'      },
  { value: 'TEMPORARY',    label: 'Temporary'      },
  { value: 'WEEKEND',      label: 'Weekend'        },
  { value: 'EMERGENCY',    label: 'Emergency'      },
  { value: 'CONTRACT',     label: 'Contract'       },
  { value: 'SEASONAL',     label: 'Seasonal'       },
  { value: 'APPRENTICESHIP', label: 'Apprenticeship' },
  { value: 'FREELANCE',    label: 'Freelance'      },
] as const

const PAY_TYPES = [
  { value: null, label: 'All' },
  { value: 'commission', label: 'Commission' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
] as const

const DISTANCES = [
  { value: null, label: 'Any' },
  { value: 5, label: '5 mi' },
  { value: 15, label: '15 mi' },
  { value: 30, label: '30 mi' },
  { value: 50, label: '50 mi' },
] as const

const STATUS_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HOT', label: 'Hot' },
  { value: 'NEW', label: 'New' },
] as const

interface Props {
  visible: boolean
  onClose: () => void
  filters: JobFilters
  onApply: (filters: JobFilters) => void
}

export function JobFilterModal({ visible, onClose, filters, onApply }: Props) {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const [draft, setDraft] = useState<JobFilters>(filters)

  const activeCount = [draft.employmentType, draft.payType, draft.distance, draft.status].filter(Boolean).length

  const handleApply = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onApply(draft)
    onClose()
  }, [draft, onApply, onClose])

  const handleClear = useCallback(() => {
    setDraft({ employmentType: null, payType: null, distance: null, status: null })
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
              Filter Jobs
            </Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={{ fontSize: 14, color: theme.brand.primary, fontWeight: '600' }}>Clear all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: bottom + 80 }}>
            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Employment Type</Text>
            <View style={s.optionsRow}>
              {EMPLOYMENT_TYPES.map((o) => {
                const active = draft.employmentType === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, employmentType: o.value }))
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

            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Pay Type</Text>
            <View style={s.optionsRow}>
              {PAY_TYPES.map((o) => {
                const active = draft.payType === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, payType: o.value }))
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

            <Text style={[s.sectionTitle, { color: theme.text.secondary }]}>Status</Text>
            <View style={s.optionsRow}>
              {STATUS_OPTIONS.map((o) => {
                const active = draft.status === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, status: o.value }))
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
            <View style={s.optionsRow}>
              {DISTANCES.map((o) => {
                const active = draft.distance === o.value
                return (
                  <TouchableOpacity
                    key={o.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setDraft((d) => ({ ...d, distance: o.value }))
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

export function activeFilterCount(f: JobFilters): number {
  return [f.employmentType, f.payType, f.distance, f.status].filter(Boolean).length
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
  applyBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
