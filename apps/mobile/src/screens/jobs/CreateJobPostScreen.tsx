import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { JobPostCard, Text, useTheme } from '@salonin/ui'
import type { CreateJobPostDto, JobPostCardData } from '@salonin/types'
import { jobsApi } from '@salonin/api-client'
import { ALL_SPECIALTIES } from '@salonin/config'
import { useLocationStore } from '../../store/locationStore'
import { useAuthStore } from '../../store/authStore'

const SPECIALTIES = ALL_SPECIALTIES

const EMPLOYMENT_TYPES: { value: string; label: string; icon: string; sub: string }[] = [
  { value: 'FULL_TIME',  label: 'Full-time',  icon: '🏢', sub: 'Regular schedule, benefits' },
  { value: 'PART_TIME',  label: 'Part-time',  icon: '⏰', sub: 'Flexible hours'            },
  { value: 'TEMPORARY',  label: 'Temporary',  icon: '📋', sub: 'Short-term or contract'     },
  { value: 'WEEKEND',    label: 'Weekend',    icon: '📅', sub: 'Sat & Sun only'             },
  { value: 'EMERGENCY',  label: 'Emergency',  icon: '🚨', sub: 'Need someone ASAP'          },
]

const PAY_TYPES: { value: string; label: string }[] = [
  { value: 'Commission', label: 'Commission' },
  { value: 'Hourly',     label: 'Hourly rate' },
  { value: 'Daily',      label: 'Daily rate'  },
  { value: 'Custom',     label: 'Custom'      },
]

const COMMISSION_SPLITS = [
  { value: 50, label: '50/50', sub: 'Even split' },
  { value: 60, label: '60/40', sub: 'You keep 60%' },
  { value: 70, label: '70/30', sub: 'You keep 70%' },
]

const DURATIONS: { days: number; label: string }[] = [
  { days: 3,  label: '3 days'  },
  { days: 7,  label: '1 week'  },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
]

export default function CreateJobPostScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const cityId = useLocationStore((s) => s.cityId)
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [payStructure, setPayStructure] = useState('')
  const [payType, setPayType] = useState('Commission')
  const [rateInput, setRateInput] = useState('')
  const [commissionSplit, setCommissionSplit] = useState(60)
  const [selectedType, setSelectedType] = useState('FULL_TIME')
  const [isUrgent, setIsUrgent] = useState(false)
  const [description, setDescription] = useState('')
  const [durationDays, setDurationDays] = useState(14)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const salonName = (user as { salonName?: string } | null)?.salonName ?? 'Your Salon'

  const resolvedPayStructure = payType === 'Commission'
    ? `${commissionSplit}/${100 - commissionSplit} Commission`
    : payType === 'Custom'
      ? payStructure.trim() || 'Pay TBD'
      : rateInput.trim() ? `${rateInput}/${payType === 'Hourly' ? 'hr' : 'day'}` : 'Pay TBD'

  const previewJob = useMemo<JobPostCardData>(() => ({
    id: '__preview__',
    title: title.trim() || 'Job Title',
    specialty: specialty || 'Specialty',
    payStructure: resolvedPayStructure,
    type: selectedType as JobPostCardData['type'],
    isUrgent,
    cityId: cityId ?? 'dmv',
    expiresAt: new Date(Date.now() + durationDays * 86_400_000).toISOString(),
    salonName,
    salonPhotoUrl: null,
  }), [title, specialty, resolvedPayStructure, selectedType, isUrgent, durationDays, cityId, salonName])

  const goNext = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (step === 1) {
      if (!title.trim()) { setError('Job title is required'); return }
      if (!specialty) { setError('Select a specialty'); return }
    }
    if (step === 2) {
      if (payType === 'Custom' && !payStructure.trim()) { setError('Describe the pay arrangement'); return }
      if ((payType === 'Hourly' || payType === 'Daily') && !rateInput.trim()) { setError('Enter a rate'); return }
    }
    setError(undefined)
    if (step < 3) {
      setStep((s) => s + 1)
    } else {
      void handleSubmit()
    }
  }, [step, title, specialty, payType, payStructure, rateInput])

  const goBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (step > 1) {
      setStep((s) => s - 1)
      setError(undefined)
    } else {
      router.back()
    }
  }, [step])

  const handleSubmit = useCallback(async () => {
    if (!cityId) { setError('Set your location first'); return }
    setIsSubmitting(true)
    setError(undefined)
    try {
      const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString()
      const dto: CreateJobPostDto = {
        title: title.trim(),
        description: description.trim(),
        specialty,
        payStructure: resolvedPayStructure,
        type: selectedType as CreateJobPostDto['type'],
        isUrgent,
        cityId,
        expiresAt,
      }
      await jobsApi.create(dto)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'Job Posted! 🎉',
        'Notifying nearby workers now.',
        [{ text: 'Done', onPress: () => router.back() }],
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, specialty, description, resolvedPayStructure, selectedType, isUrgent, durationDays, cityId])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => void goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.headerAction, { color: theme.brand.primary }]}>
            {step === 1 ? 'Cancel' : '‹ Back'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Post a Job</Text>
        <View style={{ width: 56 }} />
      </View>

      {/* ── Step dots ── */}
      <View style={styles.progressDots}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s === step
                ? { width: 20, backgroundColor: '#D85A30' }
                : s < step
                  ? { backgroundColor: '#D85A30', opacity: 0.4 }
                  : { backgroundColor: theme.border.default },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══ STEP 1: Title + Specialty + Employment Type ══ */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                What role are you hiring for?
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Job Title</Text>
                <TextInput
                  value={title}
                  onChangeText={(v) => { setTitle(v); setError(undefined) }}
                  placeholder="e.g. Experienced Colorist Needed"
                  placeholderTextColor={theme.text.tertiary}
                  style={[styles.textInputLarge, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Specialty</Text>
                <View style={styles.pillGrid}>
                  {SPECIALTIES.map((s) => {
                    const active = specialty === s
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSpecialty(s); setError(undefined) }}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                      >
                        <Text style={[styles.pillText, { color: active ? '#FFFFFF' : theme.text.secondary }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Employment Type</Text>
                <View style={styles.typeCardGrid}>
                  {EMPLOYMENT_TYPES.map(({ value, label, icon, sub }) => {
                    const active = selectedType === value
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(value) }}
                        style={[
                          styles.typeCard,
                          {
                            backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 22, marginBottom: 4 }}>{icon}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#D85A30' : theme.text.primary }}>{label}</Text>
                        <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2, textAlign: 'center' }} numberOfLines={2}>{sub}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ══ STEP 2: Pay + Urgent ══ */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                Pay & details
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Pay Structure</Text>
                <View style={styles.typeCardGrid}>
                  {PAY_TYPES.map(({ value, label }) => {
                    const active = payType === value
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPayType(value); setError(undefined) }}
                        style={[
                          styles.payCard,
                          {
                            backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#D85A30' : theme.text.primary, textAlign: 'center' }}>{label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {payType === 'Commission' && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Commission Split (worker / salon)</Text>
                  <View style={styles.splitCards}>
                    {COMMISSION_SPLITS.map(({ value, label, sub }) => {
                      const active = commissionSplit === value
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommissionSplit(value) }}
                          style={[
                            styles.splitCard,
                            {
                              backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                              borderColor: active ? '#D85A30' : theme.border.default,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '800', color: active ? '#D85A30' : theme.text.primary }}>{label}</Text>
                          <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2 }}>{sub}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}

              {(payType === 'Hourly' || payType === 'Daily') && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Rate ({payType === 'Hourly' ? 'per hour' : 'per day'})</Text>
                  <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                    <Text style={{ fontSize: 20, color: theme.text.secondary }}>$</Text>
                    <TextInput
                      value={rateInput}
                      onChangeText={(v) => { setRateInput(v); setError(undefined) }}
                      placeholder="0"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="decimal-pad"
                      style={{ flex: 1, fontSize: 22, fontWeight: '700', color: theme.text.primary, paddingVertical: 0 }}
                    />
                    <Text style={{ fontSize: 14, color: theme.text.tertiary }}>/{payType === 'Hourly' ? 'hr' : 'day'}</Text>
                  </View>
                </View>
              )}

              {payType === 'Custom' && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Describe the pay arrangement</Text>
                  <TextInput
                    value={payStructure}
                    onChangeText={(v) => { setPayStructure(v); setError(undefined) }}
                    placeholder="e.g. Booth rent $300/week"
                    placeholderTextColor={theme.text.tertiary}
                    style={[styles.textInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.urgentRow,
                  {
                    backgroundColor: isUrgent ? 'rgba(239,159,39,0.08)' : theme.bg.elevated,
                    borderColor: isUrgent ? '#EF9F27' : theme.border.default,
                  },
                ]}
                onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsUrgent((v) => !v) }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22 }}>🚨</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.urgentTitle, { color: isUrgent ? '#EF9F27' : theme.text.primary }]}>Mark as Urgent</Text>
                  <Text style={[styles.urgentSub, { color: theme.text.tertiary }]}>Gets priority placement in feed</Text>
                </View>
                <View style={[styles.toggle, { backgroundColor: isUrgent ? '#EF9F27' : theme.border.default }]}>
                  <View style={[styles.toggleKnob, { transform: [{ translateX: isUrgent ? 20 : 2 }] }]} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ══ STEP 3: Duration + Preview ══ */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                How long is this position?
              </Text>

              <View style={styles.fieldGroup}>
                <View style={styles.durationGrid}>
                  {DURATIONS.map(({ days, label }) => {
                    const active = durationDays === days
                    return (
                      <TouchableOpacity
                        key={days}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDurationDays(days) }}
                        style={[
                          styles.durationCard,
                          {
                            backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '800', color: active ? '#D85A30' : theme.text.primary }}>{label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Description (optional)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Share more about the role, schedule, expectations..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  maxLength={500}
                  style={[styles.descriptionInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  autoCapitalize="sentences"
                />
                <Text style={{ fontSize: 11, color: description.length > 460 ? '#D85A30' : theme.text.tertiary, textAlign: 'right' }}>
                  {description.length}/500
                </Text>
              </View>

              <View style={styles.previewSection}>
                <Text style={[styles.previewLabel, { color: theme.text.tertiary }]}>Preview</Text>
                <JobPostCard job={previewJob} onPress={() => {}} />
              </View>
            </View>
          )}

          {error !== undefined && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky CTA ── */}
      <View style={[styles.ctaBar, {
        backgroundColor: theme.bg.surface,
        borderTopColor: theme.border.subtle,
        paddingBottom: Math.max(bottom, 16),
      }]}>
        <TouchableOpacity
          onPress={() => void goNext()}
          disabled={isSubmitting}
          style={[styles.ctaBtn, isSubmitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaBtnText, { color: theme.text.inverse }]}>
            {isSubmitting ? 'Posting…' : step < 3 ? 'Continue →' : 'Post Job →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  headerAction: { fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  progressDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  scrollContent: { padding: 16 },
  previewSection: { marginTop: 4 },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepContent: { gap: 20 },
  stepTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  textInputLarge: {
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: '500' },
  typeCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  payCard: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  splitCards: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  rateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    width: '47%',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  urgentTitle: { fontSize: 15, fontWeight: '600' },
  urgentSub: { fontSize: 12, marginTop: 2 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#E24B4A',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  ctaBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
})
