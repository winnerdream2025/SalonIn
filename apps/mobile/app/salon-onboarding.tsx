import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, Button, Input, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'

const STEP_COUNT = 2

const SPECIALTY_OPTIONS = [
  'Hair braiding',
  'Nail tech',
  'Makeup artist',
  'Lash tech',
  'Barber',
  'Hairstylist',
  'Esthetician',
  'Waxing',
]

export default function SalonOnboardingScreen() {
  const { theme } = useTheme()

  const [step, setStep] = useState(0)
  const [salonName, setSalonName] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [isHiring, setIsHiring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const toggleSpecialty = useCallback((s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  const handleFinish = useCallback(async () => {
    setIsSaving(true)
    try {
      await salonsApi.updateProfile({
        name: salonName.trim() || undefined,
        description: bio.trim() || undefined,
        specialties: selectedSpecialties,
      })
      await salonsApi.setHiringStatus(isHiring)
      if (isHiring) {
        router.replace('/jobs/create' as never)
      } else {
        router.replace('/(tabs)')
      }
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [salonName, bio, selectedSpecialties, isHiring])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={styles.topRow}>
        <View style={styles.progressRow}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressBar,
                { backgroundColor: i <= step ? theme.brand.primary : theme.border.default },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text variant="caption" color="secondary">Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="label" color="secondary" style={styles.stepLabel}>
            STEP {step + 1} OF {STEP_COUNT}
          </Text>

          {step === 0 && (
            <>
              <Text variant="heading" style={styles.heading}>Set up your salon</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Tell workers what makes your salon special.
              </Text>

              <View style={styles.field}>
                <Input
                  label="Salon name"
                  value={salonName}
                  onChangeText={setSalonName}
                  autoCapitalize="words"
                  placeholder="Your salon name"
                />
              </View>

              <View style={styles.field}>
                <Input
                  label="Description"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell workers about your salon…"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Text variant="label" color="secondary" style={styles.specialtyLabel}>
                SPECIALTIES
              </Text>
              <View style={styles.pillGrid}>
                {SPECIALTY_OPTIONS.map((s) => {
                  const active = selectedSpecialties.includes(s)
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleSpecialty(s)}
                      activeOpacity={0.8}
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
                        style={{ color: active ? '#FFFFFF' : theme.text.primary }}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text variant="heading" style={styles.heading}>Are you hiring?</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Let workers know you have open positions right now.
              </Text>

              <View style={[styles.hiringCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                <View style={styles.hiringRow}>
                  <View style={styles.hiringTextCol}>
                    <Text variant="title" style={{ color: theme.text.primary }}>
                      Hiring now
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.hiringSubtitle}>
                      Workers will see your salon as actively recruiting
                    </Text>
                  </View>
                  <Switch
                    value={isHiring}
                    onValueChange={setIsHiring}
                    trackColor={{ false: theme.border.default, true: theme.brand.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {isHiring ? (
                <View style={[styles.ctaCard, { backgroundColor: 'rgba(216,90,48,0.08)', borderColor: 'rgba(216,90,48,0.2)' }]}>
                  <Text variant="body" style={{ color: theme.brand.primary, fontWeight: '600' }}>
                    Post your first job
                  </Text>
                  <Text variant="caption" color="secondary" style={{ marginTop: 4 }}>
                    Tapping "Get started" will take you to the job creator.
                  </Text>
                </View>
              ) : (
                <View style={[styles.ctaCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                  <Text variant="body" style={{ color: theme.text.primary }}>
                    You can post jobs anytime from your profile.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: theme.bg.base, borderTopColor: theme.border.default }]}>
        {step === 0 && (
          <Button variant="primary" fullWidth onPress={() => setStep(1)}>
            Continue
          </Button>
        )}

        {step === 1 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(0)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" loading={isSaving} onPress={handleFinish}>
                Get started
              </Button>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  skipBtn: { paddingLeft: 8, paddingVertical: 4 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepLabel: { letterSpacing: 0.8, marginBottom: 8 },
  heading: { marginBottom: 8 },
  subheading: { marginBottom: 28, lineHeight: 22 },
  field: { marginBottom: 16 },
  specialtyLabel: { letterSpacing: 0.8, marginBottom: 12, marginTop: 8 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  hiringCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  hiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hiringTextCol: { flex: 1 },
  hiringSubtitle: { marginTop: 4, lineHeight: 18 },
  ctaCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: { flex: 1 },
})
