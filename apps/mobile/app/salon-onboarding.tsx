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
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, Input, Avatar, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'
import { ALL_SPECIALTIES } from '@salonin/config'
import * as Location from 'expo-location'
import { reverseGeocodeWithGoogle } from '../src/utils/googlePlaces'
import { useMediaUpload } from '../src/hooks/useMediaUpload'

const STEP_COUNT = 4

const SPECIALTY_OPTIONS = ALL_SPECIALTIES

export default function SalonOnboardingScreen() {
  const { theme } = useTheme()
  const { pickAndUpload, isUploading } = useMediaUpload({
    folder: 'uploads',
    type: 'image',
    allowsEditing: true,
  })

  const [step, setStep] = useState(0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [salonName, setSalonName] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isHiring, setIsHiring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handlePickPhoto = useCallback(async () => {
    try {
      const url = await pickAndUpload()
      if (!url) return
      setPhotoUrl(url)
      await salonsApi.updateProfile({ photoUrls: [url] })
    } catch {
      Alert.alert('Upload failed', 'Please try again.')
    }
  }, [pickAndUpload])

  const toggleSpecialty = useCallback((s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  const handleDetectLocation = useCallback(async () => {
    setIsDetecting(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enter your city and state manually.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLocationLat(pos.coords.latitude)
      setLocationLng(pos.coords.longitude)
      const resolved = await reverseGeocodeWithGoogle(pos.coords.latitude, pos.coords.longitude)
      if (resolved) {
        setCity(resolved.city ?? '')
        setState(resolved.state ?? '')
      }
    } catch {
      Alert.alert('Could not detect location', 'Enter your city and state manually.')
    } finally {
      setIsDetecting(false)
    }
  }, [])

  const handleFinish = useCallback(async () => {
    setIsSaving(true)
    try {
      await salonsApi.updateProfile({
        name: salonName.trim() || undefined,
        description: bio.trim() || undefined,
        specialties: selectedSpecialties,
      })
      if (locationLat !== null && locationLng !== null) {
        await salonsApi.updateLocation(
          locationLat,
          locationLng,
          city.trim() || undefined,
          state.trim() || undefined,
          'US',
        )
      } else if (city.trim()) {
        await salonsApi.updateLocation(0, 0, city.trim(), state.trim() || undefined, 'US')
          .catch(() => {})
      }
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
  }, [salonName, bio, selectedSpecialties, locationLat, locationLng, city, state, isHiring])

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

          {/* Step 0 — Salon photo (new) */}
          {step === 0 && (
            <>
              <Text variant="heading" style={styles.heading}>Add a salon photo</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                A great cover photo helps workers and clients recognise your salon.
              </Text>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => { void handlePickPhoto() }}
                disabled={isUploading}
                activeOpacity={0.75}
              >
                <Avatar uri={photoUrl ?? undefined} name="Salon" size="xl" />
                <Text variant="caption" color="brand" style={styles.photoHint}>
                  {isUploading ? 'Uploading…' : photoUrl ? 'Change Photo' : '+ Add Photo'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 1 — Salon info (was step 0) */}
          {step === 1 && (
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
                  const active = selectedSpecialties.includes(s.id)
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => toggleSpecialty(s.id)}
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
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Step 2 — Location (was step 1) */}
          {step === 2 && (
            <>
              <Text variant="heading" style={styles.heading}>Where is your salon?</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Help clients and workers find you nearby.
              </Text>

              <TouchableOpacity
                onPress={() => void handleDetectLocation()}
                disabled={isDetecting}
                style={[
                  styles.detectBtn,
                  { backgroundColor: 'rgba(216,90,48,0.08)', borderColor: 'rgba(216,90,48,0.3)' },
                ]}
                activeOpacity={0.75}
              >
                {isDetecting ? (
                  <ActivityIndicator size="small" color="#D85A30" />
                ) : (
                  <Ionicons name="location-outline" size={18} color="#D85A30" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#D85A30', marginLeft: 8 }}>
                  {isDetecting ? 'Detecting…' : locationLat ? '📍 Location detected' : 'Use my current location'}
                </Text>
              </TouchableOpacity>

              <Text variant="label" color="secondary" style={{ marginTop: 20, marginBottom: 12, letterSpacing: 0.8 }}>
                OR ENTER MANUALLY
              </Text>

              <View style={styles.field}>
                <Input
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Miami"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.field}>
                <Input
                  label="State / Province"
                  value={state}
                  onChangeText={setState}
                  placeholder="e.g. FL"
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          {/* Step 3 — Hiring (was step 2) */}
          {step === 3 && (
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
        {/* Step 0: photo — always skippable */}
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
              <Button variant="primary" onPress={() => setStep(2)}>Continue</Button>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(1)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" onPress={() => setStep(3)}>Continue</Button>
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
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  photoHint: {
    marginTop: 4,
  },
})
