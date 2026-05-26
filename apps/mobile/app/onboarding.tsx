import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Avatar, Text, Button, Input, useTheme } from '@salonin/ui'
import { Availability } from '@salonin/types'
import { workersApi } from '@salonin/api-client'
import { useMyWorkerProfile } from '../src/hooks/useWorkerProfile'
import { useMediaUpload } from '../src/hooks/useMediaUpload'

const STEP_LABELS = ['Photo', 'Specialties', 'Availability', 'Location'] as const
const STEP_COUNT = STEP_LABELS.length

const AVAILABILITY_OPTIONS: Availability[] = [
  Availability.NOW,
  Availability.TODAY,
  Availability.WEEKEND,
  Availability.NOT_AVAILABLE,
]

const AVAIL_LABELS: Record<Availability, string> = {
  [Availability.NOW]: 'Available Now',
  [Availability.TODAY]: 'Available Today',
  [Availability.WEEKEND]: 'Weekends Only',
  [Availability.NOT_AVAILABLE]: 'Not Available',
}

type GeoPosition = { coords: { latitude: number; longitude: number } }
function requestGeolocation(onSuccess: (pos: GeoPosition) => void): void {
  const nav = (global as Record<string, unknown>)['navigator'] as
    | { geolocation?: { getCurrentPosition?: (s: (p: GeoPosition) => void, e: () => void) => void } }
    | undefined
  nav?.geolocation?.getCurrentPosition?.(onSuccess, () => {})
}

const CITY_NAMES: Record<string, string> = {
  dmv: 'DMV (DC / MD / VA)',
  atlanta: 'Atlanta, GA',
  houston: 'Houston, TX',
  miami: 'Miami, FL',
}

export default function OnboardingScreen() {
  const { profile, isLoading } = useMyWorkerProfile()
  const { theme } = useTheme()
  const { pickAndUpload, isUploading } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })

  const [step, setStep] = useState(0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [availability, setAvailability] = useState<Availability>(Availability.NOW)
  const [locationShared, setLocationShared] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && profile && profile.specialties.length > 0) {
      router.replace('/(tabs)')
    }
  }, [isLoading, profile])

  const handlePickPhoto = useCallback(async () => {
    try {
      const url = await pickAndUpload()
      if (!url) return
      setPhotoUrl(url)
      await workersApi.updateProfile({ photoUrl: url })
    } catch {
      Alert.alert('Upload failed', 'Please try again.')
    }
  }, [pickAndUpload])

  const handleShareLocation = useCallback(() => {
    requestGeolocation((pos) => {
      workersApi
        .updateLocation(pos.coords.latitude, pos.coords.longitude)
        .then(() => setLocationShared(true))
        .catch(() => {})
    })
  }, [])

  const handleFinish = useCallback(async () => {
    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setIsSaving(true)
    try {
      await workersApi.updateProfile({ specialties })
      await workersApi.updateAvailability({ availability })
      router.replace('/(tabs)')
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [specialtiesText, availability])

  const specialtiesChips = specialtiesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const canAdvanceStep1 = specialtiesChips.length > 0
  const cityLabel = CITY_NAMES[profile?.cityId ?? ''] ?? profile?.cityId ?? '—'

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.centered}>
          <Text variant="body" color="secondary">Loading…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={styles.progressRow}>
        {STEP_LABELS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressBar,
              { backgroundColor: i <= step ? theme.brand.primary : theme.border.default },
            ]}
          />
        ))}
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
              <Text variant="heading" style={styles.heading}>Add your photo</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                A clear photo helps salons recognise you at a glance.
              </Text>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={handlePickPhoto}
                disabled={isUploading}
                activeOpacity={0.75}
              >
                <Avatar uri={photoUrl ?? profile?.photoUrl} name={profile?.name ?? 'Me'} size="xl" />
                <Text variant="caption" color="brand" style={styles.photoHint}>
                  {isUploading ? 'Uploading…' : photoUrl ? 'Change Photo' : '+ Add Photo'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 1 && (
            <>
              <Text variant="heading" style={styles.heading}>Your specialties</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Enter your skills separated by commas. This is what salons search for.
              </Text>
              <Input
                label="Specialties"
                value={specialtiesText}
                onChangeText={setSpecialtiesText}
                placeholder="e.g. Haircut, Color, Balayage"
                autoCapitalize="words"
                autoFocus
              />
              {specialtiesChips.length > 0 && (
                <View style={styles.chipRow}>
                  {specialtiesChips.map((chip) => (
                    <View
                      key={chip}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.bg.elevated, borderColor: theme.border.default },
                      ]}
                    >
                      <Text variant="caption">{chip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Text variant="heading" style={styles.heading}>When are you available?</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Salons will see this badge on your profile. You can change it anytime.
              </Text>
              <View style={styles.availGrid}>
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const active = availability === opt
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setAvailability(opt)}
                      activeOpacity={0.8}
                      style={[
                        styles.availPill,
                        {
                          backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                          borderColor: active ? theme.brand.primary : theme.border.default,
                        },
                      ]}
                    >
                      <Text
                        variant="body"
                        style={{
                          color: active ? '#FFFFFF' : theme.text.primary,
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {AVAIL_LABELS[opt]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text variant="heading" style={styles.heading}>Your location</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Share your GPS position so nearby salons can discover you first.
              </Text>
              <View style={[styles.cityCard, { backgroundColor: theme.bg.elevated }]}>
                <Text variant="label" color="secondary" style={styles.cityCardLabel}>YOUR CITY</Text>
                <Text variant="title">{cityLabel}</Text>
              </View>
              <Button
                variant={locationShared ? 'secondary' : 'primary'}
                fullWidth
                onPress={handleShareLocation}
                disabled={locationShared}
              >
                {locationShared ? '✓ Location shared' : 'Share my location'}
              </Button>
              {!locationShared && (
                <Text variant="caption" color="secondary" style={styles.locationHint}>
                  You can skip this — your city alone is enough to be discovered.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: theme.bg.base, borderTopColor: theme.border.default }]}>
        {step === 0 && (
          <Button
            variant="primary"
            fullWidth
            onPress={() => setStep(1)}
            disabled={isUploading}
          >
            {photoUrl ? 'Next' : 'Skip for now'}
          </Button>
        )}

        {step === 1 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(0)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" onPress={() => setStep(2)} disabled={!canAdvanceStep1}>
                Next
              </Button>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(1)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" onPress={() => setStep(3)}>Next</Button>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(2)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" loading={isSaving} onPress={handleFinish}>
                Finish setup
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepLabel: {
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heading: {
    marginBottom: 8,
  },
  subheading: {
    marginBottom: 28,
    lineHeight: 22,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  photoHint: {
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  availGrid: {
    gap: 12,
  },
  availPill: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cityCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 6,
  },
  cityCardLabel: {
    letterSpacing: 0.8,
  },
  locationHint: {
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
  },
})
