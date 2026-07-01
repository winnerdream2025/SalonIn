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
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Text, Button, Input, useTheme } from '@salonin/ui'
import { Availability } from '@salonin/types'
import { workersApi, parseApiError } from '@salonin/api-client'
import { SPECIALTY_CATEGORIES, SPECIALTIES_BY_CATEGORY } from '@salonin/config'
import { reverseGeocodeWithGoogle } from '../src/utils/googlePlaces'
import { useLocationStore } from '../src/store/locationStore'
import { useMyWorkerProfile } from '../src/hooks/useWorkerProfile'
import { useMediaUpload } from '../src/hooks/useMediaUpload'
import { servicesApi } from '../src/services/booking/booking.api'

const STEP_LABELS = ['Photo', 'Specialties', 'Availability', 'Location', 'First Service'] as const
const STEP_COUNT = STEP_LABELS.length

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const

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

export default function OnboardingScreen() {
  const { profile, isLoading } = useMyWorkerProfile()
  const { theme } = useTheme()
  const { pickAndUpload, isUploading } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })
  const setLocation = useLocationStore((s) => s.setLocation)
  const storeCity = useLocationStore((s) => s.city)

  const [step, setStep] = useState(0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [availability, setAvailability] = useState<Availability>(Availability.NOW)
  const [locationShared, setLocationShared] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Step 4 — first service
  const [serviceName, setServiceName] = useState('')
  const [serviceDuration, setServiceDuration] = useState<typeof DURATION_OPTIONS[number]>(60)
  const [servicePrice, setServicePrice] = useState('')
  const [isCreatingService, setIsCreatingService] = useState(false)
  const [serviceCreated, setServiceCreated] = useState(false)

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

  const handleShareLocation = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Location access required',
            'Enable location in Settings so nearby salons can discover you.',
            [{ text: 'OK' }]
          )
        }
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude: lat, longitude: lng } = pos.coords
      const resolved = await reverseGeocodeWithGoogle(lat, lng)
      if (resolved) {
        setLocation({
          lat,
          lng,
          city: resolved.city,
          state: resolved.state,
          country: resolved.country,
          countryCode: resolved.countryCode,
          placeId: resolved.placeId,
          formattedAddress: resolved.formattedAddress,
        })
      } else {
        setLocation({ lat, lng, city: 'Selected area', country: '', formattedAddress: 'Selected area' })
      }
      await workersApi.updateLocation(
        lat,
        lng,
        resolved?.city,
        resolved?.state,
        resolved?.country,
      )
      setLocationShared(true)
    } catch {
      Alert.alert('Could not get location', 'Please try again.')
    }
  }, [setLocation])

  const toggleSpecialty = useCallback((s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  const handleSaveAndContinue = useCallback(async () => {
    setIsSaving(true)
    try {
      await workersApi.updateProfile({ specialties: selectedSpecialties })
      await workersApi.updateAvailability({ availability })
      setStep(4)
    } catch (e) {
      Alert.alert('Could not save', parseApiError(e))
    } finally {
      setIsSaving(false)
    }
  }, [selectedSpecialties, availability])

  const handleCreateService = useCallback(async () => {
    const trimmedName = serviceName.trim()
    const price = parseFloat(servicePrice.replace(/[^0-9.]/g, ''))
    if (!trimmedName) {
      Alert.alert('Service name required', 'Enter a name for your service.')
      return
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price greater than 0.')
      return
    }
    setIsCreatingService(true)
    try {
      await servicesApi.create({
        name: trimmedName,
        duration: serviceDuration,
        price,
        currency: 'USD',
      })
      setServiceCreated(true)
    } catch (e) {
      Alert.alert('Could not create service', parseApiError(e))
    } finally {
      setIsCreatingService(false)
    }
  }, [serviceName, serviceDuration, servicePrice])

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)')
  }, [])

  const canAdvanceStep1 = selectedSpecialties.length > 0
  const cityLabel = profile?.city ?? storeCity ?? 'Not set yet'

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
                Select everything that applies — salons filter by these.
              </Text>
              {SPECIALTY_CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.categoryBlock}>
                  <Text variant="label" color="secondary" style={styles.categoryLabel}>
                    {cat.label.toUpperCase()}
                  </Text>
                  <View style={styles.chipRow}>
                    {(SPECIALTIES_BY_CATEGORY[cat.id] ?? []).map((s) => {
                      const active = selectedSpecialties.includes(s.id)
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => toggleSpecialty(s.id)}
                          activeOpacity={0.8}
                          style={[
                            styles.chip,
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
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              ))}
              {selectedSpecialties.length > 0 && (
                <Text variant="caption" color="secondary" style={styles.selectionHint}>
                  {selectedSpecialties.length} selected
                </Text>
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
                onPress={() => void handleShareLocation()}
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

          {step === 4 && (
            <>
              <Text variant="heading" style={styles.heading}>Add your first service</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Clients can book you once you have at least one service listed. You can add more anytime.
              </Text>

              {serviceCreated ? (
                <View
                  style={[styles.serviceSuccessCard, { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: '#1D9E75' }]}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#1D9E75" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1D9E75' }}>{serviceName}</Text>
                    <Text variant="caption" color="secondary">
                      {serviceDuration} min · ${servicePrice}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Input
                      label="Service name"
                      value={serviceName}
                      onChangeText={setServiceName}
                      placeholder="e.g. Knotless Braids, Silk Press…"
                      autoCapitalize="words"
                    />
                  </View>

                  <Text variant="label" color="secondary" style={styles.durationLabel}>DURATION</Text>
                  <View style={styles.durationRow}>
                    {DURATION_OPTIONS.map((min) => {
                      const active = serviceDuration === min
                      return (
                        <TouchableOpacity
                          key={min}
                          onPress={() => setServiceDuration(min)}
                          activeOpacity={0.8}
                          style={[
                            styles.durationPill,
                            {
                              backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                              borderColor: active ? theme.brand.primary : theme.border.default,
                            },
                          ]}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: active ? '#FFFFFF' : theme.text.primary,
                              fontWeight: active ? '700' : '400',
                            }}
                          >
                            {min < 60 ? `${min}m` : `${min / 60}h`}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <View style={[styles.field, { marginTop: 20 }]}>
                    <Input
                      label="Price (USD)"
                      value={servicePrice}
                      onChangeText={setServicePrice}
                      placeholder="e.g. 120"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <Button
                    variant="secondary"
                    fullWidth
                    loading={isCreatingService}
                    onPress={() => void handleCreateService()}
                    disabled={!serviceName.trim() || !servicePrice}
                  >
                    Add service
                  </Button>
                </>
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
              <Button variant="primary" loading={isSaving} onPress={() => void handleSaveAndContinue()}>
                Next
              </Button>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={handleFinish}>
                {serviceCreated ? 'Done' : 'Skip'}
              </Button>
            </View>
            {!serviceCreated && (
              <View style={styles.footerBtn}>
                <Button variant="primary" onPress={handleFinish}>
                  Finish setup
                </Button>
              </View>
            )}
            {serviceCreated && (
              <View style={styles.footerBtn}>
                <Button variant="primary" onPress={handleFinish}>
                  Let&apos;s go
                </Button>
              </View>
            )}
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
  categoryBlock: {
    marginBottom: 16,
  },
  categoryLabel: {
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectionHint: {
    marginTop: 12,
    textAlign: 'center',
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
  field: { marginBottom: 16 },
  durationLabel: { letterSpacing: 0.8, marginBottom: 10 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  serviceSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
})
