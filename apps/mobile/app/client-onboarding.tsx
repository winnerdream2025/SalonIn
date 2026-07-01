import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, useTheme } from '@salonin/ui'
import { SPECIALTY_CATEGORIES } from '@salonin/config'
import { useDeviceLocation } from '../src/hooks/useDeviceLocation'
import { useLocationStore } from '../src/store/locationStore'
import { LocationModal } from '../src/components/LocationModal'

const STEP_COUNT = 3

// ── Emoji decorations for the 6 specialty categories ─────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  hair: '💇',
  nails: '💅',
  lashes: '👁️',
  makeup: '💄',
  barber: '✂️',
  skincare: '✨',
}

export default function ClientOnboardingScreen() {
  const { theme } = useTheme()
  const [step, setStep] = useState(0)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [locationModalVisible, setLocationModalVisible] = useState(false)

  const { requestLocation, status } = useDeviceLocation()
  const lat = useLocationStore((s) => s.lat)
  const city = useLocationStore((s) => s.city)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)

  const hasLocation = lat != null
  const locationLabel = city ?? (isGPSLocation ? 'Near you' : null)

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)')
  }, [])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Top: progress bar + Skip */}
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
        <TouchableOpacity
          onPress={handleFinish}
          style={styles.skipBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text variant="caption" color="secondary">Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="label" color="secondary" style={styles.stepLabel}>
            STEP {step + 1} OF {STEP_COUNT}
          </Text>

          {/* Step 0 — Interests */}
          {step === 0 && (
            <>
              <Text variant="heading" style={styles.heading}>What are you looking for?</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Pick everything that applies — we&apos;ll show you the best pros first.
              </Text>
              <View style={styles.categoryGrid}>
                {SPECIALTY_CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat.id)
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      activeOpacity={0.8}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                          borderColor: active ? theme.brand.primary : theme.border.default,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[cat.id] ?? '💆'}</Text>
                      <Text
                        variant="body"
                        style={{
                          color: active ? '#FFFFFF' : theme.text.primary,
                          fontWeight: active ? '700' : '500',
                          textAlign: 'center',
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {selectedCategories.length > 0 && (
                <Text variant="caption" color="secondary" style={styles.selectionHint}>
                  {selectedCategories.length} selected
                </Text>
              )}
            </>
          )}

          {/* Step 1 — Location */}
          {step === 1 && (
            <>
              <Text variant="heading" style={styles.heading}>Find pros near you</Text>
              <Text variant="body" color="secondary" style={styles.subheading}>
                Share your location to see beauty professionals in your area.
              </Text>

              {locationLabel ? (
                <View
                  style={[
                    styles.locationResult,
                    { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: '#1D9E75' },
                  ]}
                >
                  <Ionicons name="location" size={18} color="#1D9E75" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1D9E75', flex: 1 }}>
                    {locationLabel}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setLocationModalVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 13, color: theme.brand.primary, fontWeight: '600' }}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : status === 'requesting' ? (
                <View style={styles.gpsLoading}>
                  <ActivityIndicator color={theme.brand.primary} />
                  <Text variant="body" color="secondary">Getting your location…</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.gpsBtn, { backgroundColor: theme.brand.primary }]}
                    onPress={() => { void requestLocation() }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Use my location</Text>
                  </TouchableOpacity>
                  <View style={styles.orRow}>
                    <View style={[styles.orLine, { backgroundColor: theme.border.subtle }]} />
                    <Text variant="caption" color="secondary" style={{ paddingHorizontal: 10 }}>or</Text>
                    <View style={[styles.orLine, { backgroundColor: theme.border.subtle }]} />
                  </View>
                  <TouchableOpacity
                    style={[styles.cityBtn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                    onPress={() => setLocationModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={16} color={theme.text.secondary} />
                    <Text style={{ fontSize: 15, color: theme.text.secondary }}>Search a city…</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Step 2 — All set */}
          {step === 2 && (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: 'rgba(29,158,117,0.10)' }]}>
                <Ionicons name="checkmark-circle" size={52} color="#1D9E75" />
              </View>
              <Text variant="heading" style={[styles.heading, { textAlign: 'center' }]}>
                You&apos;re all set!
              </Text>
              <Text variant="body" color="secondary" style={[styles.subheading, { textAlign: 'center' }]}>
                Browse stylists, braiders, nail techs, and more — all near you. Book an appointment in seconds.
              </Text>
              <View style={[styles.howCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
                <Text variant="body" style={{ fontWeight: '700', color: theme.text.primary, marginBottom: 8 }}>
                  How it works
                </Text>
                <View style={styles.howRow}>
                  <Text style={styles.howEmoji}>🔍</Text>
                  <Text variant="caption" color="secondary">Discover top-rated pros nearby</Text>
                </View>
                <View style={styles.howRow}>
                  <Text style={styles.howEmoji}>📅</Text>
                  <Text variant="caption" color="secondary">Book instantly — no phone calls</Text>
                </View>
                <View style={styles.howRow}>
                  <Text style={styles.howEmoji}>⭐</Text>
                  <Text variant="caption" color="secondary">Review your experience after every visit</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer nav */}
      <View style={[styles.footer, { backgroundColor: theme.bg.base, borderTopColor: theme.border.default }]}>
        {step === 0 && (
          <Button
            variant="primary"
            fullWidth
            onPress={() => setStep(1)}
          >
            {selectedCategories.length > 0 ? 'Continue' : 'Skip for now'}
          </Button>
        )}

        {step === 1 && (
          <>
            <View style={styles.footerBtn}>
              <Button variant="ghost" onPress={() => setStep(0)}>Back</Button>
            </View>
            <View style={styles.footerBtn}>
              <Button variant="primary" onPress={() => setStep(2)}>
                {hasLocation ? 'Continue' : 'Skip for now'}
              </Button>
            </View>
          </>
        )}

        {step === 2 && (
          <Button variant="primary" fullWidth onPress={handleFinish}>
            Start exploring
          </Button>
        )}
      </View>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
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
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  skipBtn: { paddingLeft: 8, paddingVertical: 4 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  stepLabel: { letterSpacing: 0.8, marginBottom: 8 },
  heading: { marginBottom: 8 },
  subheading: { marginBottom: 28, lineHeight: 22 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '46%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryEmoji: { fontSize: 28 },
  selectionHint: { marginTop: 16, textAlign: 'center' },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  orLine: { flex: 1, height: 1 },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  doneWrap: { alignItems: 'center', paddingTop: 16 },
  doneIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  howCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '100%',
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  howEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
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
