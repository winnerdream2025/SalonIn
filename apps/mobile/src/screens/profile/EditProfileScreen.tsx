import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
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
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Text, Button, useTheme } from '@salonin/ui'
import { Availability } from '@salonin/types'
import type { AvailabilitySchedule } from '@salonin/types'
import { workersApi, parseApiError } from '@salonin/api-client'
import { SPECIALTY_CATEGORIES, SPECIALTIES_BY_CATEGORY, specialtyLabel, WORKER_PAY_TYPES, PERCENTAGE_PRESETS, SEAT_RATE_PRESETS, buildWorkerPayString } from '@salonin/config'
import type { WorkerPayType } from '@salonin/config'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMediaUpload } from '../../hooks/useMediaUpload'

// ── Constants ─────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const CATEGORY_ICONS: Record<string, IoniconsName> = {
  hair:     'cut-outline',
  nails:    'color-palette-outline',
  lashes:   'eye-outline',
  makeup:   'sparkles-outline',
  barber:   'cut-outline',
  skincare: 'leaf-outline',
}

const AVAIL_OPTIONS: { value: Availability; label: string; sub: string; color: string }[] = [
  { value: Availability.NOW,           label: 'Available now',   sub: 'Ready to work immediately', color: '#1D9E75' },
  { value: Availability.TODAY,         label: 'Available today', sub: 'Free later today',           color: '#378ADD' },
  { value: Availability.WEEKEND,       label: 'This weekend',    sub: 'Available Sat or Sun',       color: '#EF9F27' },
  { value: Availability.NOT_AVAILABLE, label: 'Not available',   sub: 'Pause your visibility',      color: '#6B6B6B' },
]

const RADIUS_PRESETS = [5, 10, 15, 25, 50, 100]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = []
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) break
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
})()

function formatTime(t: string): string {
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

const COMPLETION_STEPS = ['Photo', 'Bio', 'Skills', 'Exp.', 'Status']

// ── TrackSlider ───────────────────────────────────────────────────────────────

function TrackSlider({
  value, min, max, label, onChange,
}: {
  value: number; min: number; max: number
  label: (v: number) => string; onChange: (v: number) => void
}) {
  const { theme } = useTheme()
  const widthRef = useRef(0)
  const KNOB = 24

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
      onPanResponderMove: (e) => { onChange(toValue(e.nativeEvent.locationX)) },
    }),
  ).current

  const fillPct = Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)))

  return (
    <View style={{ paddingVertical: 4 }}>
      <View
        onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width }}
        style={{ height: 48, justifyContent: 'center' }}
        {...pan.panHandlers}
      >
        <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.border.default }}>
          <View style={{ width: `${fillPct}%`, height: '100%', backgroundColor: '#D85A30', borderRadius: 3 }} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${fillPct}%` as `${number}%`,
            marginLeft: -(KNOB / 2),
            top: (48 - KNOB) / 2,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: '#D85A30',
            borderWidth: 3,
            borderColor: theme.bg.card,
            elevation: 5,
            shadowColor: '#D85A30',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 5,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: theme.text.tertiary, fontSize: 11 }}>{min}</Text>
        <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '800' }}>{label(value)}</Text>
        <Text style={{ color: theme.text.tertiary, fontSize: 11 }}>{max}+</Text>
      </View>
    </View>
  )
}

// ── AccordionSection ──────────────────────────────────────────────────────────

function AccordionSection({
  title, subtitle, icon, isComplete, isOpen, onPress, children,
}: {
  title: string; subtitle: string; icon: IoniconsName; isComplete: boolean
  isOpen: boolean; onPress: () => void; children: React.ReactNode
}) {
  const { theme } = useTheme()
  const iconBg = isComplete ? 'rgba(29,158,117,0.12)' : 'rgba(216,90,48,0.10)'
  const iconColor = isComplete ? '#1D9E75' : '#D85A30'

  return (
    <View style={[accordionStyles.wrap, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <TouchableOpacity
        onPress={onPress}
        style={[accordionStyles.header, { borderBottomColor: isOpen ? theme.border.subtle : 'transparent' }]}
        activeOpacity={0.7}
      >
        {/* Icon badge */}
        <View style={[accordionStyles.iconBadge, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[accordionStyles.title, { color: theme.text.primary }]}>{title}</Text>
          {!isOpen && (
            <Text style={[accordionStyles.subtitle, { color: theme.text.tertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={accordionStyles.headerRight}>
          {isComplete && (
            <View style={accordionStyles.completeBadge}>
              <Ionicons name="checkmark" size={11} color="#1D9E75" />
            </View>
          )}
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={theme.text.tertiary}
          />
        </View>
      </TouchableOpacity>

      {isOpen && <View style={accordionStyles.body}>{children}</View>}
    </View>
  )
}

const accordionStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  completeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 12,
  },
})

// ── EditProfileScreen ─────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const { top, bottom } = useSafeAreaInsets()
  const { profile, isLoading } = useMyWorkerProfile()
  const { theme } = useTheme()
  const { pickAndUpload: pickAvatar, isUploading: isUploadingPhoto } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })

  // ── State ──
  const [name,             setName]             = useState('')
  const [bio,              setBio]              = useState('')
  const [specialties,      setSpecialties]      = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [experienceYears,  setExperienceYears]  = useState(0)
  const [licenseNumber,    setLicenseNumber]    = useState('')
  const [availability,     setAvailability]     = useState<Availability>(Availability.NOW)
  const [photoUrl,         setPhotoUrl]         = useState<string | null>(null)
  const [radiusMiles,      setRadiusMiles]      = useState(15)
  const [workerPayType,    setWorkerPayType]    = useState<WorkerPayType>('HOURLY')
  const [payMin,           setPayMin]           = useState('')
  const [payMax,           setPayMax]           = useState('')
  const [payPercentage,    setPayPercentage]    = useState<number | null>(null)
  const [seatRate,         setSeatRate]         = useState('')
  const [payCustomText,    setPayCustomText]    = useState('')
  const [rateNote,         setRateNote]         = useState('')
  const [isSaving,         setIsSaving]         = useState(false)
  const [openSection,      setOpenSection]      = useState<string | null>(null)
  const [availScheduleDays, setAvailScheduleDays] = useState<string[]>([])
  const [availStartTime,    setAvailStartTime]    = useState('09:00')
  const [availEndTime,      setAvailEndTime]      = useState('17:00')
  const [timePickerFor,     setTimePickerFor]     = useState<'start' | 'end' | null>(null)

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
    const p = profile as { workerPayType?: string; payMin?: number | null; payMax?: number | null; payPercentage?: number | null; seatRate?: number | null; rateRange?: string; rateNote?: string; expectedPay?: string }
    if (p.workerPayType) {
      setWorkerPayType(p.workerPayType as WorkerPayType)
      setPayMin(p.payMin != null ? String(p.payMin) : '')
      setPayMax(p.payMax != null ? String(p.payMax) : '')
      setPayPercentage(p.payPercentage ?? null)
      setSeatRate(p.seatRate != null ? String(p.seatRate) : '')
    } else {
      const rr    = p.rateRange ?? ''
      const match = rr.match(/\$(\d+)\s*[–-]\s*\$(\d+)/)
      if (match) { setPayMin(match[1]!); setPayMax(match[2]!) }
    }
    setRateNote(p.rateNote ?? '')
    if (profile.availabilitySchedule) {
      const sched = profile.availabilitySchedule as AvailabilitySchedule
      setAvailScheduleDays(sched.days)
      setAvailStartTime(sched.startTime)
      setAvailEndTime(sched.endTime)
    }
    const firstIncomplete =
      profile.specialties.length === 0 ? 'specialties'
      : profile.experienceYears === 0  ? 'experience'
      : null
    setOpenSection(firstIncomplete)
  }, [profile])

  // Completion
  const completionSteps = [
    !!photoUrl,
    bio.length > 20,
    specialties.length > 0,
    experienceYears > 0,
    availability !== Availability.NOT_AVAILABLE,
  ]
  const completionScore = completionSteps.filter(Boolean).length
  const completionPct   = Math.round((completionScore / 5) * 100)
  const isComplete      = completionPct === 100
  const progressColor   = isComplete ? '#1D9E75' : '#D85A30'

  const toggleSection = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setOpenSection((s) => (s === id ? null : id))
  }, [])

  const toggleDay = useCallback((day: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setAvailScheduleDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }, [])

  const toggleSpecialty = useCallback((sub: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSpecialties((prev) => prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub])
  }, [])

  const handleChangePhoto = useCallback(async () => {
    const url = await pickAvatar()
    if (!url) return
    setPhotoUrl(url)
    await workersApi.updateProfile({ photoUrl: url })
  }, [pickAvatar])

  const doSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const resolvedPayMin = payMin ? Number(payMin) : undefined
      const resolvedPayMax = payMax ? Number(payMax) : undefined
      const resolvedSeatRate = seatRate ? Number(seatRate) : undefined
      const rateRange = buildWorkerPayString({
        payType: workerPayType,
        payMin: resolvedPayMin,
        payMax: resolvedPayMax,
        payPercentage,
        seatRate: resolvedSeatRate,
        customText: payCustomText.trim(),
      })
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
        workerPayType,
        payMin: resolvedPayMin,
        payMax: resolvedPayMax,
        payPercentage: payPercentage ?? undefined,
        seatRate: resolvedSeatRate,
        availabilitySchedule: availScheduleDays.length > 0
          ? { days: availScheduleDays, startTime: availStartTime, endTime: availEndTime }
          : undefined,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      Alert.alert('Save failed', parseApiError(e))
    } finally {
      setIsSaving(false)
    }
  }, [name, bio, specialties, experienceYears, licenseNumber, radiusMiles, workerPayType, payMin, payMax, payPercentage, seatRate, payCustomText, rateNote, availability, availScheduleDays, availStartTime, availEndTime])

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
  }, [name, specialties, doSave])

  const firstInitial = (name?.[0] ?? 'W').toUpperCase()

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>

      {/* ── Nav bar ─────────────────────────────────────── */}
      <View style={[styles.navbar, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.base }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navAction, { color: theme.text.secondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text.primary }]}>Edit Profile</Text>
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={isSaving || isLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navAction, { color: isSaving ? theme.text.tertiary : '#D85A30', fontWeight: '700' }]}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Photo hero ──────────────────────────────────── */}
          <View style={[styles.heroCover, { backgroundColor: theme.bg.elevated }]} />
          <View style={styles.heroContent}>
            <TouchableOpacity
              onPress={() => void handleChangePhoto()}
              disabled={isUploadingPhoto}
              activeOpacity={0.85}
              style={styles.photoWrap}
            >
              <View style={[styles.photoCircle, { borderColor: '#D85A30', backgroundColor: theme.bg.elevated }]}>
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#D85A30" size="large" />
                ) : photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <Text style={styles.photoInitial}>{firstInitial}</Text>
                )}
              </View>
              <View style={styles.photoCameraBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.photoHint, { color: theme.text.tertiary }]}>
              {isUploadingPhoto ? 'Uploading…' : 'Tap to change photo'}
            </Text>
          </View>

          {/* ── Portfolio shortcut ──────────────────────────── */}
          <TouchableOpacity
            style={[styles.portfolioRow, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              router.push('/worker/portfolio')
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionIconBadge, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
              <Ionicons name="images-outline" size={17} color="#D85A30" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionCardTitle, { color: theme.text.primary }]} numberOfLines={1}>
                Portfolio
              </Text>
              <Text style={[styles.photoHint, { color: theme.text.tertiary }]} numberOfLines={1}>
                {(profile?.portfolioItems?.length ?? 0) > 0
                  ? `${profile?.portfolioItems.length} item${profile?.portfolioItems.length === 1 ? '' : 's'} · add photos or videos`
                  : 'Add photos or videos of your work'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
          </TouchableOpacity>

          {/* ── Progress card ──────────────────────────────── */}
          <View style={[styles.progressCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Ionicons
                  name={isComplete ? 'checkmark-circle' : 'stats-chart-outline'}
                  size={15}
                  color={progressColor}
                />
                <Text style={[styles.progressTitle, { color: theme.text.secondary }]}>
                  Profile strength
                </Text>
              </View>
              <Text style={[styles.progressPct, { color: progressColor }]}>{completionPct}%</Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: theme.border.default }]}>
              <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: progressColor }]} />
            </View>

            <View style={styles.stepsRow}>
              {COMPLETION_STEPS.map((step, i) => {
                const done = completionSteps[i] ?? false
                return (
                  <View key={step} style={styles.stepCell}>
                    <View style={[styles.stepDot, { backgroundColor: done ? progressColor : theme.border.default }]}>
                      {done && <Ionicons name="checkmark" size={9} color="#FFF" />}
                    </View>
                    <Text style={[styles.stepLabel, { color: done ? progressColor : theme.text.tertiary }]}>
                      {step}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          <View style={{ height: 6 }} />

          {/* ── About card (Name + Bio) ─────────────────────── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            {/* Header row */}
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
                <Ionicons name="person-outline" size={17} color="#D85A30" />
              </View>
              <Text style={[styles.sectionCardTitle, { color: theme.text.primary }]}>About You</Text>
            </View>

            {/* Display name */}
            <View style={[styles.fieldGroup, { borderTopColor: theme.border.subtle }]}>
              <Text style={[styles.fieldLabel, { color: theme.text.tertiary }]}>Display name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.lineInput, { color: theme.text.primary, borderBottomColor: theme.border.default }]}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Bio */}
            <View style={[styles.fieldGroup, { borderTopColor: theme.border.subtle }]}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: theme.text.tertiary }]}>Bio</Text>
                <Text style={[styles.charCount, { color: bio.length > 280 ? '#D85A30' : theme.text.tertiary }]}>
                  {bio.length}/300
                </Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell salons what makes you unique — your style, strengths, and experience..."
                placeholderTextColor={theme.text.tertiary}
                multiline
                maxLength={300}
                style={[styles.bioInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                autoCapitalize="sentences"
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={{ height: 6 }} />

          {/* ── Specialties accordion ──────────────────────── */}
          <AccordionSection
            title="Specialties"
            subtitle={specialties.length > 0
              ? specialties.slice(0, 3).map((id) => specialtyLabel(id)).join(', ') + (specialties.length > 3 ? ` +${specialties.length - 3}` : '')
              : 'Select your skills'}
            icon="cut-outline"
            isComplete={specialties.length > 0}
            isOpen={openSection === 'specialties'}
            onPress={() => toggleSection('specialties')}
          >
            {/* Category tabs */}
            <View style={styles.categoryRow}>
              {SPECIALTY_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setSelectedCategory((prev) => (prev === cat.id ? null : cat.id))
                    }}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                        borderColor: active ? '#D85A30' : theme.border.default,
                      },
                    ]}
                  >
                    <Ionicons name={CATEGORY_ICONS[cat.id] ?? 'ellipsis-horizontal-circle-outline'} size={14} color={active ? '#FFFFFF' : theme.text.secondary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Sub-specialties */}
            {selectedCategory && (
              <View style={[styles.subSection, { borderTopColor: theme.border.subtle }]}>
                <Text style={[styles.subLabel, { color: theme.text.tertiary }]}>
                  {SPECIALTY_CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? ''}
                </Text>
                <View style={styles.pillGrid}>
                  {(SPECIALTIES_BY_CATEGORY[selectedCategory ?? ''] ?? []).map((s) => {
                    const active = specialties.includes(s.id)
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggleSpecialty(s.id)}
                        style={[
                          styles.subPill,
                          {
                            backgroundColor: active ? '#D85A30' : theme.bg.base,
                            borderColor: active ? '#D85A30' : theme.border.default,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Selected */}
            {specialties.length > 0 && (
              <View style={[styles.subSection, { borderTopColor: theme.border.subtle }]}>
                <Text style={[styles.subLabel, { color: theme.text.tertiary }]}>Selected ({specialties.length})</Text>
                <View style={styles.pillGrid}>
                  {specialties.map((id) => (
                    <TouchableOpacity
                      key={id}
                      onPress={() => toggleSpecialty(id)}
                      style={[styles.subPill, { backgroundColor: '#D85A30', borderColor: '#D85A30' }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{specialtyLabel(id)} ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </AccordionSection>

          {/* ── Experience accordion ───────────────────────── */}
          <AccordionSection
            title="Experience"
            subtitle={experienceYears > 0
              ? `${experienceYears} year${experienceYears !== 1 ? 's' : ''} of experience`
              : 'Set your experience level'}
            icon="trophy-outline"
            isComplete={experienceYears > 0}
            isOpen={openSection === 'experience'}
            onPress={() => toggleSection('experience')}
          >
            <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>Years of professional experience</Text>
            <TrackSlider
              value={experienceYears}
              min={0}
              max={20}
              label={(v) => v === 0 ? 'New pro' : v >= 20 ? '20+ yrs' : `${v} yr${v !== 1 ? 's' : ''}`}
              onChange={setExperienceYears}
            />
            <View style={[styles.subSection, { borderTopColor: theme.border.subtle }]}>
              <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>
                License / Certification{' '}
                <Text style={{ color: theme.text.tertiary, fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g. Cosmetology License #12345"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.roundedInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                autoCapitalize="characters"
              />
            </View>
          </AccordionSection>

          {/* ── Availability accordion ─────────────────────── */}
          <AccordionSection
            title="Availability"
            subtitle={AVAIL_OPTIONS.find((o) => o.value === availability)?.label ?? 'Set your status'}
            icon="time-outline"
            isComplete={availability !== Availability.NOT_AVAILABLE}
            isOpen={openSection === 'availability'}
            onPress={() => toggleSection('availability')}
          >
            <View style={{ gap: 8 }}>
              {AVAIL_OPTIONS.map(({ value, label, sub, color }) => {
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
                        backgroundColor: active ? `${color}14` : theme.bg.elevated,
                        borderColor: active ? color : theme.border.default,
                      },
                    ]}
                  >
                    <View style={[styles.availDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? color : theme.text.primary }}>
                        {label}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>{sub}</Text>
                    </View>
                    <View style={[styles.radioOuter, { borderColor: active ? color : theme.border.default }]}>
                      {active && <View style={[styles.radioInner, { backgroundColor: color }]} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* ── Weekly Schedule ── */}
            <View style={[styles.subSection, { borderTopColor: theme.border.subtle }]}>
              <Text style={[styles.subLabel, { color: theme.text.tertiary }]}>Weekly Schedule</Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: -4 }}>
                Optional — set your typical working days &amp; hours
              </Text>
              <View style={styles.dayGrid}>
                {DAYS.map((day) => {
                  const active = availScheduleDays.includes(day)
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                          borderColor: active ? '#D85A30' : theme.border.default,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : theme.text.secondary }}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {availScheduleDays.length > 0 && (
                <View style={styles.scheduleTimeRow}>
                  <TouchableOpacity
                    onPress={() => setTimePickerFor('start')}
                    style={[styles.timePickerBtn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                  >
                    <Ionicons name="time-outline" size={14} color={theme.text.tertiary} />
                    <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 14, flex: 1 }}>
                      {formatTime(availStartTime)}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color={theme.text.tertiary} />
                  </TouchableOpacity>
                  <Text style={{ color: theme.text.tertiary, fontSize: 16, paddingHorizontal: 4 }}>–</Text>
                  <TouchableOpacity
                    onPress={() => setTimePickerFor('end')}
                    style={[styles.timePickerBtn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                  >
                    <Ionicons name="time-outline" size={14} color={theme.text.tertiary} />
                    <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 14, flex: 1 }}>
                      {formatTime(availEndTime)}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </AccordionSection>

          {/* ── Rate accordion ─────────────────────────────── */}
          <AccordionSection
            title="Rate"
            subtitle={buildWorkerPayString({ payType: workerPayType, payMin: payMin ? Number(payMin) : null, payMax: payMax ? Number(payMax) : null, payPercentage, seatRate: seatRate ? Number(seatRate) : null, customText: payCustomText })}
            icon="cash-outline"
            isComplete={workerPayType === 'HOURLY' ? !!(payMin || payMax) : workerPayType === 'PERCENTAGE' ? payPercentage != null : workerPayType === 'SEAT' ? !!seatRate : !!payCustomText.trim()}
            isOpen={openSection === 'rate'}
            onPress={() => toggleSection('rate')}
          >
            {/* Pay type selector */}
            <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>Pay type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {WORKER_PAY_TYPES.map(({ value, label, icon }) => {
                const active = workerPayType === value
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWorkerPayType(value) }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 8,
                      borderRadius: 20, borderWidth: 1.5,
                      backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                      borderColor: active ? '#D85A30' : theme.border.default,
                    }}
                  >
                    <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={14} color={active ? '#D85A30' : theme.text.tertiary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#D85A30' : theme.text.primary }}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* HOURLY: min / max inputs */}
            {workerPayType === 'HOURLY' && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subLabel, { color: theme.text.tertiary, marginBottom: 6 }]}>Min /hr</Text>
                  <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                    <Text style={{ fontSize: 17, color: theme.text.tertiary, fontWeight: '600' }}>$</Text>
                    <TextInput
                      value={payMin}
                      onChangeText={(t) => setPayMin(t.replace(/[^0-9]/g, ''))}
                      placeholder="60"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="number-pad"
                      style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary, paddingVertical: 0 }}
                    />
                  </View>
                </View>
                <View style={{ alignSelf: 'flex-end', paddingBottom: 14 }}>
                  <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>–</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subLabel, { color: theme.text.tertiary, marginBottom: 6 }]}>Max /hr</Text>
                  <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                    <Text style={{ fontSize: 17, color: theme.text.tertiary, fontWeight: '600' }}>$</Text>
                    <TextInput
                      value={payMax}
                      onChangeText={(t) => setPayMax(t.replace(/[^0-9]/g, ''))}
                      placeholder="120"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="number-pad"
                      style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary, paddingVertical: 0 }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* PERCENTAGE: preset chips */}
            {workerPayType === 'PERCENTAGE' && (
              <View>
                <Text style={[styles.sectionHint, { color: theme.text.secondary, marginBottom: 8 }]}>% of service fee you keep</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PERCENTAGE_PRESETS.map(({ value, label, sub }) => {
                    const active = payPercentage === value
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPayPercentage(value) }}
                        activeOpacity={0.8}
                        style={{
                          alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
                          borderRadius: 12, borderWidth: 1.5,
                          backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                          borderColor: active ? '#D85A30' : theme.border.default,
                          minWidth: 64,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '800', color: active ? '#D85A30' : theme.text.primary }}>{label}</Text>
                        {!!sub && <Text style={{ fontSize: 10, color: theme.text.tertiary, marginTop: 1 }}>{sub}</Text>}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* SEAT: preset + manual input */}
            {workerPayType === 'SEAT' && (
              <View>
                <Text style={[styles.sectionHint, { color: theme.text.secondary, marginBottom: 8 }]}>Amount per client seated ($)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {SEAT_RATE_PRESETS.map((val) => {
                    const active = seatRate === String(val)
                    return (
                      <TouchableOpacity
                        key={val}
                        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeatRate(String(val)) }}
                        activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8,
                          borderRadius: 12, borderWidth: 1.5,
                          backgroundColor: active ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                          borderColor: active ? '#D85A30' : theme.border.default,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#D85A30' : theme.text.primary }}>${val}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <View style={[styles.rateInputWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                  <Text style={{ fontSize: 17, color: theme.text.tertiary, fontWeight: '600' }}>$</Text>
                  <TextInput
                    value={seatRate}
                    onChangeText={(t) => setSeatRate(t.replace(/[^0-9.]/g, ''))}
                    placeholder="Custom amount"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                    style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary, paddingVertical: 0 }}
                  />
                  <Text style={{ fontSize: 13, color: theme.text.tertiary }}>/seat</Text>
                </View>
              </View>
            )}

            {/* CUSTOM: free text */}
            {workerPayType === 'CUSTOM' && (
              <View>
                <Text style={[styles.sectionHint, { color: theme.text.secondary, marginBottom: 8 }]}>Describe your arrangement</Text>
                <TextInput
                  value={payCustomText}
                  onChangeText={setPayCustomText}
                  placeholder="e.g. $300/week booth rent"
                  placeholderTextColor={theme.text.tertiary}
                  style={[styles.roundedInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                />
              </View>
            )}

            <View style={[styles.subSection, { borderTopColor: theme.border.subtle }]}>
              <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>
                Note{' '}
                <Text style={{ color: theme.text.tertiary, fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                value={rateNote}
                onChangeText={setRateNote}
                placeholder="e.g. Rate varies by style"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.roundedInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
          </AccordionSection>

          {/* ── Travel Radius accordion ────────────────────── */}
          <AccordionSection
            title="Travel Radius"
            subtitle={`Up to ${radiusMiles} mi from your location`}
            icon="navigate-circle-outline"
            isComplete
            isOpen={openSection === 'radius'}
            onPress={() => toggleSection('radius')}
          >
            <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>
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
                    <Text style={{ fontSize: 15, fontWeight: '800', color: active ? '#FFFFFF' : theme.text.primary }}>
                      {r}
                    </Text>
                    <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.75)' : theme.text.tertiary }}>
                      mi
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <TrackSlider
              value={radiusMiles}
              min={1}
              max={100}
              label={(v) => `${v} mi`}
              onChange={(v) => setRadiusMiles(v)}
            />
          </AccordionSection>

          {/* ── Save button ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Button variant="primary" fullWidth loading={isSaving || isLoading} onPress={() => void handleSave()}>
              Save Changes
            </Button>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Time Picker Modal ── */}
      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerFor(null)}
        >
          <View style={[styles.modalSheet, { backgroundColor: theme.bg.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {timePickerFor === 'start' ? 'Start Time' : 'End Time'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerFor(null)}>
                <Ionicons name="close-circle" size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {TIME_OPTIONS.map((t) => {
                const isSelected = timePickerFor === 'start' ? availStartTime === t : availEndTime === t
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => {
                      if (timePickerFor === 'start') setAvailStartTime(t)
                      else setAvailEndTime(t)
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setTimePickerFor(null)
                    }}
                    style={[
                      styles.timeOption,
                      { borderBottomColor: theme.border.subtle },
                      isSelected && { backgroundColor: 'rgba(216,90,48,0.08)' },
                    ]}
                  >
                    <Text style={{
                      fontSize: 16,
                      color: isSelected ? '#D85A30' : theme.text.primary,
                      fontWeight: isSelected ? '700' : '400',
                    }}>
                      {formatTime(t)}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#D85A30" />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Nav bar
  navbar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navAction: {
    fontSize: 15,
    fontWeight: '500',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Hero
  heroCover: {
    height: 90,
  },
  heroContent: {
    marginTop: -44,
    alignItems: 'center',
    paddingBottom: 20,
    gap: 6,
  },
  photoWrap:   { position: 'relative' },
  photoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D85A30',
  },
  photoCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photoHint: {
    fontSize: 12,
    fontWeight: '400',
  },

  // Progress card
  progressCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepCell: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Portfolio shortcut row
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

  // About / section card
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fieldGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lineInput: {
    fontSize: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  bioInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 90,
  },

  // Accordion internals
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  subSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
  },
  roundedInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  availDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radiusPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  radiusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  rateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 4,
  },

  // Weekly schedule
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  // Time picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
