import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  PanResponder,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Text, Button, useTheme } from '@salonin/ui'
import { Availability } from '@salonin/types'
import { workersApi } from '@salonin/api-client'
import { BEAUTY_SPECIALTIES } from '@salonin/config'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMediaUpload } from '../../hooks/useMediaUpload'

const CATEGORY_ICONS: Record<string, string> = {
  Hair: '💇', Nails: '💅', Lashes: '�', Makeup: '💄', Barber: '✂️', Skincare: '✨', Other: '�',
}
const SPECIALTY_CATEGORIES = Object.fromEntries(
  Object.entries(BEAUTY_SPECIALTIES).map(([cat, subs]) => [cat, { icon: CATEGORY_ICONS[cat] ?? '🔧', subs }]),
) as Record<string, { icon: string; subs: string[] }>

const AVAIL_OPTIONS: { value: Availability; icon: string; label: string; sub: string; color: string }[] = [
  { value: Availability.NOW,           icon: '🟢', label: 'Available now',    sub: 'Ready to work immediately',   color: '#1D9E75' },
  { value: Availability.TODAY,         icon: '🔵', label: 'Available today',  sub: 'Free later today',             color: '#378ADD' },
  { value: Availability.WEEKEND,       icon: '🟡', label: 'This weekend',     sub: 'Available Sat or Sun',         color: '#EF9F27' },
  { value: Availability.NOT_AVAILABLE, icon: '⚫', label: 'Not available',    sub: 'Pause visibility',             color: '#6B6B6B' },
]

const RADIUS_PRESETS = [5, 10, 15, 25, 50]

function TrackSlider({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number
  min: number
  max: number
  label: (v: number) => string
  onChange: (v: number) => void
}) {
  const { theme } = useTheme()
  const widthRef = useRef(0)
  const KNOB = 22

  const toValue = (x: number) => {
    const pct = Math.max(0, Math.min(1, x / widthRef.current))
    return Math.round(min + pct * (max - min))
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        onChange(toValue(e.nativeEvent.locationX))
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
      onPanResponderMove: (e) => {
        onChange(toValue(e.nativeEvent.locationX))
      },
    }),
  ).current

  const fillPct = Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)))

  return (
    <View style={{ paddingVertical: 4 }}>
      <View
        onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width }}
        style={{ height: 44, justifyContent: 'center' }}
        {...pan.panHandlers}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.border.default }}>
          <View style={{ width: `${fillPct}%`, height: '100%', backgroundColor: '#D85A30', borderRadius: 2 }} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${fillPct}%` as `${number}%`,
            marginLeft: -(KNOB / 2),
            top: (44 - KNOB) / 2,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: '#D85A30',
            borderWidth: 3,
            borderColor: theme.bg.card,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: theme.text.tertiary, fontSize: 11 }}>{min}</Text>
        <Text style={{ color: '#D85A30', fontSize: 14, fontWeight: '700' }}>{label(value)}</Text>
        <Text style={{ color: theme.text.tertiary, fontSize: 11 }}>{max}+</Text>
      </View>
    </View>
  )
}

function SectionHeader({
  title,
  subtitle,
  isComplete,
  isOpen,
  onPress,
}: {
  title: string
  subtitle: string
  isComplete: boolean
  isOpen: boolean
  onPress: () => void
}) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.sectionHeader, { borderBottomColor: isOpen ? theme.border.default : 'transparent' }]}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, letterSpacing: -0.2 }}>{title}</Text>
        {!isOpen && (
          <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {isComplete && (
          <View style={styles.completeBadge}>
            <Text style={{ fontSize: 11, color: '#1D9E75', fontWeight: '700' }}>✓</Text>
          </View>
        )}
        <Text style={{ fontSize: 18, color: theme.text.tertiary }}>{isOpen ? '⌃' : '⌄'}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function EditProfileScreen() {
  const { top, bottom } = useSafeAreaInsets()
  const { profile, isLoading } = useMyWorkerProfile()
  const { theme } = useTheme()
  const { pickAndUpload: pickAvatar, isUploading: isUploadingPhoto } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [experienceYears, setExperienceYears] = useState(0)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [availability, setAvailability] = useState<Availability>(Availability.NOW)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(15)
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')
  const [rateNote, setRateNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('photo')

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setBio(profile.bio ?? '')
    setSpecialties(profile.specialties)
    setExperienceYears(profile.experienceYears)
    setAvailability(profile.availability)
    setPhotoUrl(profile.photoUrl)
    setLicenseNumber((profile as { licenseNumber?: string }).licenseNumber ?? '')
    setRadiusMiles((profile as { radiusMiles?: number }).radiusMiles ?? 15)
    const rr = (profile as { rateRange?: string }).rateRange ?? ''
    const match = rr.match(/\$(\d+)\s*[–-]\s*\$(\d+)/)
    if (match) { setRateMin(match[1]!); setRateMax(match[2]!) }
    setRateNote((profile as { rateNote?: string }).rateNote ?? '')
    const firstIncomplete = !profile.photoUrl ? 'photo'
      : (profile.bio?.length ?? 0) < 20 ? 'bio'
      : profile.specialties.length === 0 ? 'specialties'
      : null
    setOpenSection(firstIncomplete)
  }, [profile])

  const completionScore = [
    !!photoUrl,
    bio.length > 20,
    specialties.length > 0,
    experienceYears > 0,
    availability !== Availability.NOT_AVAILABLE,
  ].filter(Boolean).length
  const completionPct = Math.round((completionScore / 5) * 100)

  const toggleSection = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setOpenSection((s) => (s === id ? null : id))
  }, [])

  const toggleSpecialty = useCallback((sub: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSpecialties((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    )
  }, [])

  const handleChangePhoto = useCallback(async () => {
    const url = await pickAvatar()
    if (!url) return
    setPhotoUrl(url)
    await workersApi.updateProfile({ photoUrl: url })
  }, [pickAvatar])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.')
      return
    }
    if (specialties.length === 0) {
      Alert.alert(
        'No specialties selected',
        'Add at least one specialty so salons can find you.',
        [
          { text: 'Add now', style: 'cancel' },
          { text: 'Save anyway', onPress: () => void doSave() },
        ],
      )
      return
    }
    void doSave()
  }, [name, specialties, bio, experienceYears, licenseNumber, radiusMiles, rateMin, rateMax, rateNote, availability])

  const doSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const rateRange = rateMin && rateMax ? `$${rateMin} – $${rateMax} /hr` : undefined
      await workersApi.updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        specialties,
        experienceYears,
        licenseNumber: licenseNumber.trim() || undefined,
        radiusMiles,
        rateRange,
        rateNote: rateNote.trim() || undefined,
        availability,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [name, bio, specialties, experienceYears, licenseNumber, radiusMiles, rateMin, rateMax, rateNote, availability])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 15, color: '#D85A30', fontWeight: '500' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>Edit Profile</Text>
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={isSaving || isLoading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 15, color: isSaving ? theme.text.tertiary : '#D85A30', fontWeight: '700' }}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Completion bar ── */}
      <View style={[styles.completionBar, { backgroundColor: theme.bg.elevated }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 6 }}>
            Your profile is{' '}
            <Text style={{ color: completionPct === 100 ? '#1D9E75' : '#D85A30', fontWeight: '700' }}>
              {completionPct}% complete
            </Text>
          </Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.border.default }}>
            <View
              style={{
                width: `${completionPct}%`,
                height: '100%',
                backgroundColor: completionPct === 100 ? '#1D9E75' : '#D85A30',
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Name ─── */}
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderBottomColor: theme.border.subtle }]}>
            <Text style={[styles.fieldLabel, { color: theme.text.tertiary }]}>DISPLAY NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.inlineInput, { color: theme.text.primary, borderBottomColor: theme.border.default }]}
              autoCapitalize="words"
            />
          </View>

          {/* ─── PHOTO ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Photo"
              subtitle={photoUrl ? 'Profile photo set' : 'Add a profile photo'}
              isComplete={!!photoUrl}
              isOpen={openSection === 'photo'}
              onPress={() => toggleSection('photo')}
            />
            {openSection === 'photo' && (
              <View style={styles.sectionBody}>
                <TouchableOpacity
                  style={styles.photoCircleWrap}
                  onPress={() => void handleChangePhoto()}
                  disabled={isUploadingPhoto}
                  activeOpacity={0.8}
                >
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.photoCircle} resizeMode="cover" />
                  ) : (
                    <View style={[styles.photoCircle, styles.photoPlaceholder, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                      <Text style={{ fontSize: 36 }}>📷</Text>
                    </View>
                  )}
                  {isUploadingPhoto && (
                    <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  )}
                  <View style={[styles.photoBadge, { backgroundColor: '#D85A30' }]}>
                    <Text style={{ fontSize: 12, color: theme.text.inverse }}>✎</Text>
                  </View>
                </TouchableOpacity>
                <Text style={{ fontSize: 13, color: theme.text.secondary, textAlign: 'center', marginTop: 8 }}>
                  {isUploadingPhoto ? 'Uploading…' : 'Tap to change your photo'}
                </Text>
              </View>
            )}
          </View>

          {/* ─── BIO ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Bio"
              subtitle={bio.length > 20 ? bio.slice(0, 50) + '…' : 'Tell salons what makes you unique'}
              isComplete={bio.length > 20}
              isOpen={openSection === 'bio'}
              onPress={() => toggleSection('bio')}
            />
            {openSection === 'bio' && (
              <View style={styles.sectionBody}>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell salons what makes you unique..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  maxLength={300}
                  style={[styles.bioInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  autoCapitalize="sentences"
                />
                <Text style={{ fontSize: 11, color: bio.length > 280 ? '#D85A30' : theme.text.tertiary, textAlign: 'right', marginTop: 4 }}>
                  {bio.length}/300
                </Text>
              </View>
            )}
          </View>

          {/* ─── SPECIALTIES ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Specialties"
              subtitle={specialties.length > 0 ? specialties.slice(0, 3).join(', ') + (specialties.length > 3 ? ` +${specialties.length - 3}` : '') : 'Select your skills'}
              isComplete={specialties.length > 0}
              isOpen={openSection === 'specialties'}
              onPress={() => toggleSection('specialties')}
            />
            {openSection === 'specialties' && (
              <View style={styles.sectionBody}>
                <View style={styles.categoryRow}>
                  {Object.entries(SPECIALTY_CATEGORIES).map(([cat, { icon }]) => {
                    const active = selectedCategory === cat
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setSelectedCategory((prev) => (prev === cat ? null : cat))
                        }}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 14 }}>{icon}</Text>
                        <Text style={{ fontSize: 12, color: active ? '#fff' : theme.text.secondary, fontWeight: '600' }}>{cat}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {selectedCategory && (
                  <View style={[styles.subPillWrap, { borderTopColor: theme.border.subtle }]}>
                    <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 10, letterSpacing: 0.5 }}>
                      {selectedCategory.toUpperCase()}
                    </Text>
                    <View style={styles.pillGrid}>
                      {SPECIALTY_CATEGORIES[selectedCategory]!.subs.map((sub) => {
                        const active = specialties.includes(sub)
                        return (
                          <TouchableOpacity
                            key={sub}
                            onPress={() => toggleSpecialty(sub)}
                            style={[
                              styles.subPill,
                              {
                                backgroundColor: active ? '#D85A30' : theme.bg.base,
                                borderColor: active ? '#D85A30' : theme.border.default,
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 12, color: active ? '#fff' : theme.text.secondary }}>{sub}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}

                {specialties.length > 0 && (
                  <View style={[styles.selectedWrap, { borderTopColor: theme.border.subtle }]}>
                    <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 8, letterSpacing: 0.5 }}>SELECTED</Text>
                    <View style={styles.pillGrid}>
                      {specialties.map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => toggleSpecialty(s)}
                          style={[styles.subPill, { backgroundColor: '#D85A30', borderColor: '#D85A30' }]}
                        >
                          <Text style={{ fontSize: 12, color: theme.text.inverse }}>{s} ×</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ─── EXPERIENCE ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Experience"
              subtitle={experienceYears > 0 ? `${experienceYears} year${experienceYears !== 1 ? 's' : ''} experience` : 'Set your experience level'}
              isComplete={experienceYears > 0}
              isOpen={openSection === 'experience'}
              onPress={() => toggleSection('experience')}
            />
            {openSection === 'experience' && (
              <View style={styles.sectionBody}>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12 }}>Years of experience</Text>
                <TrackSlider
                  value={experienceYears}
                  min={0}
                  max={20}
                  label={(v) => (v === 0 ? 'New pro' : v >= 20 ? '20+ years' : `${v} year${v !== 1 ? 's' : ''}`)}
                  onChange={setExperienceYears}
                />
                <View style={[styles.certSection, { borderTopColor: theme.border.subtle }]}>
                  <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 10 }}>License / Certification (optional)</Text>
                  <TextInput
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    placeholder="e.g. Cosmetology License #12345"
                    placeholderTextColor={theme.text.tertiary}
                    style={[styles.textInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}
          </View>

          {/* ─── AVAILABILITY ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Availability"
              subtitle={AVAIL_OPTIONS.find((o) => o.value === availability)?.label ?? 'Set your status'}
              isComplete={availability !== Availability.NOT_AVAILABLE}
              isOpen={openSection === 'availability'}
              onPress={() => toggleSection('availability')}
            />
            {openSection === 'availability' && (
              <View style={[styles.sectionBody, { gap: 10 }]}>
                {AVAIL_OPTIONS.map(({ value, icon, label, sub, color }) => {
                  const active = availability === value
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        setAvailability(value)
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.availCard,
                        {
                          backgroundColor: active ? `${color}18` : theme.bg.elevated,
                          borderColor: active ? color : theme.border.default,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 24 }}>{icon}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? color : theme.text.primary }} numberOfLines={1}>{label}</Text>
                        <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 1 }} numberOfLines={1}>{sub}</Text>
                      </View>
                      <View style={[styles.radioOuter, { borderColor: active ? color : theme.border.default }]}>
                        {active && <View style={[styles.radioInner, { backgroundColor: color }]} />}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          {/* ─── RATE ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Rate"
              subtitle={rateMin && rateMax ? `$${rateMin} – $${rateMax} /hr` : 'Set your hourly rate range'}
              isComplete={!!(rateMin && rateMax)}
              isOpen={openSection === 'rate'}
              onPress={() => toggleSection('rate')}
            />
            {openSection === 'rate' && (
              <View style={styles.sectionBody}>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12 }}>Hourly rate range</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 4, letterSpacing: 0.5 }}>MIN</Text>
                    <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                      <Text style={{ fontSize: 16, color: theme.text.tertiary }}>$</Text>
                      <TextInput
                        value={rateMin}
                        onChangeText={(t) => setRateMin(t.replace(/[^0-9]/g, ''))}
                        placeholder="60"
                        placeholderTextColor={theme.text.tertiary}
                        keyboardType="number-pad"
                        style={{ flex: 1, fontSize: 16, color: theme.text.primary, paddingVertical: 0 }}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 4, letterSpacing: 0.5 }}>MAX</Text>
                    <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                      <Text style={{ fontSize: 16, color: theme.text.tertiary }}>$</Text>
                      <TextInput
                        value={rateMax}
                        onChangeText={(t) => setRateMax(t.replace(/[^0-9]/g, ''))}
                        placeholder="120"
                        placeholderTextColor={theme.text.tertiary}
                        keyboardType="number-pad"
                        style={{ flex: 1, fontSize: 16, color: theme.text.primary, paddingVertical: 0 }}
                      />
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 4, letterSpacing: 0.5 }}>NOTE (optional)</Text>
                  <TextInput
                    value={rateNote}
                    onChangeText={setRateNote}
                    placeholder="Rate varies by style"
                    placeholderTextColor={theme.text.tertiary}
                    style={[styles.textInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* ─── RADIUS ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Travel Radius"
              subtitle={`Up to ${radiusMiles} mi from your location`}
              isComplete={true}
              isOpen={openSection === 'radius'}
              onPress={() => toggleSection('radius')}
            />
            {openSection === 'radius' && (
              <View style={styles.sectionBody}>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12 }}>
                  How far will you travel for work?
                </Text>
                <View style={styles.radiusPresets}>
                  {RADIUS_PRESETS.map((r) => {
                    const active = radiusMiles === r
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setRadiusMiles(r)
                        }}
                        style={[
                          styles.radiusBtn,
                          {
                            backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : theme.text.primary }}>{r}</Text>
                        <Text style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.8)' : theme.text.tertiary }}>mi</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <View style={[styles.radiusVisual, { borderColor: theme.border.default }]}>
                  <View style={[styles.radiusRing, { borderColor: '#D85A3030', width: 120, height: 120, borderRadius: 60 }]} />
                  <View style={[styles.radiusRing, { borderColor: '#D85A3055', width: 72, height: 72, borderRadius: 36 }]} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#D85A30' }} />
                  <Text style={{ position: 'absolute', bottom: 8, fontSize: 11, color: theme.text.tertiary }}>
                    {radiusMiles} mi radius
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ─── Save button ─── */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <Button variant="primary" fullWidth loading={isSaving || isLoading} onPress={() => void handleSave()}>
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  completionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  completeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: {
    padding: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inlineInput: {
    fontSize: 15,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  photoCircleWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subPillWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  certSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radiusPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  radiusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  radiusVisual: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  rateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 4,
  },
})
