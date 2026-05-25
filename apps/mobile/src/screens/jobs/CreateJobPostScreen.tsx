import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Input, Button, Text, useTheme } from '@salonin/ui'
import type { CreateJobPostDto } from '@salonin/types'
import { jobsApi } from '@salonin/api-client'
import { useLocationStore } from '../../store/locationStore'

const EMPLOYMENT_TYPES: { value: string; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'WEEKEND', label: 'Weekend' },
  { value: 'EMERGENCY', label: 'Emergency' },
]

const DURATIONS: { days: number; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

export default function CreateJobPostScreen() {
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [payStructure, setPayStructure] = useState('')
  const [selectedType, setSelectedType] = useState('FULL_TIME')
  const [isUrgent, setIsUrgent] = useState(false)
  const [durationDays, setDurationDays] = useState(14)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = useCallback(async () => {
    if (!cityId) { setError('Set your location first'); return }
    if (!title.trim()) { setError('Title is required'); return }
    if (!specialty.trim()) { setError('Specialty is required'); return }
    if (!payStructure.trim()) { setError('Pay structure is required'); return }

    setIsSubmitting(true)
    setError(undefined)
    try {
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      const dto: CreateJobPostDto = {
        title: title.trim(),
        description: description.trim(),
        specialty: specialty.trim(),
        payStructure: payStructure.trim(),
        type: selectedType as CreateJobPostDto['type'],
        isUrgent,
        cityId,
        expiresAt,
      }
      await jobsApi.create(dto)
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, description, specialty, payStructure, selectedType, isUrgent, durationDays, cityId])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text variant="body" style={{ color: theme.brand.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text variant="title">Post a Job</Text>
        <View style={{ width: 56 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Input
              label="Job Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Experienced Colorist Needed"
            />
          </View>

          <View style={styles.field}>
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the role and requirements..."
              multiline
            />
          </View>

          <View style={styles.field}>
            <Input
              label="Specialty"
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="e.g. Balayage, Locs, Haircut"
            />
          </View>

          <View style={styles.field}>
            <Input
              label="Pay Structure"
              value={payStructure}
              onChangeText={setPayStructure}
              placeholder="e.g. $25/hr, Commission, Booth Rent"
            />
          </View>

          {/* Employment Type */}
          <View style={styles.field}>
            <Text variant="caption" color="secondary" style={styles.fieldLabel}>
              Employment Type
            </Text>
            <View style={styles.pillRow}>
              {EMPLOYMENT_TYPES.map(({ value, label }) => {
                const active = selectedType === value
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setSelectedType(value)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                        borderColor: active ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: active ? '#FFFFFF' : theme.text.secondary }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text variant="caption" color="secondary" style={styles.fieldLabel}>
              Post Duration
            </Text>
            <View style={styles.pillRow}>
              {DURATIONS.map(({ days, label }) => {
                const active = durationDays === days
                return (
                  <TouchableOpacity
                    key={days}
                    onPress={() => setDurationDays(days)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                        borderColor: active ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: active ? '#FFFFFF' : theme.text.secondary }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Urgent toggle */}
          <TouchableOpacity
            style={[
              styles.urgentRow,
              {
                backgroundColor: theme.bg.elevated,
                borderColor: isUrgent ? '#EF9F27' : theme.border.default,
              },
            ]}
            onPress={() => setIsUrgent((v) => !v)}
          >
            <View>
              <Text variant="body">Mark as Urgent</Text>
              <Text variant="caption" color="secondary">Gets priority placement in feed</Text>
            </View>
            <View
              style={[
                styles.toggle,
                { backgroundColor: isUrgent ? '#EF9F27' : theme.border.default },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: isUrgent ? 20 : 2 }] },
                ]}
              />
            </View>
          </TouchableOpacity>

          {error !== undefined && (
            <Text variant="caption" style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.submitWrap}>
            <Button variant="primary" fullWidth loading={isSubmitting} onPress={handleSubmit}>
              Post Job
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: { padding: 16, paddingBottom: 48 },
  field: { marginBottom: 20 },
  fieldLabel: { marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  errorText: { color: '#E74C3C', marginBottom: 12 },
  submitWrap: { marginTop: 8 },
})
