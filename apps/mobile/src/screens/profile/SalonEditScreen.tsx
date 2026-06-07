import React, { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Text, Button, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'
import { BEAUTY_SPECIALTIES } from '@salonin/config'
import { useMySalonProfile } from '../../hooks/useMySalonProfile'
import { useMediaUpload } from '../../hooks/useMediaUpload'

const CATEGORY_ICONS: Record<string, string> = {
  Hair: '💇', Nails: '💅', Lashes: '�', Makeup: '💄', Barber: '✂️', Skincare: '✨', Other: '�',
}
const SPECIALTY_CATEGORIES = Object.fromEntries(
  Object.entries(BEAUTY_SPECIALTIES).map(([cat, subs]) => [cat, { icon: CATEGORY_ICONS[cat] ?? '🔧', subs }]),
) as Record<string, { icon: string; subs: string[] }>

function SectionHeader({
  title,
  subtitle,
  isOpen,
  onPress,
}: {
  title: string
  subtitle: string
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
      <Text style={{ fontSize: 18, color: theme.text.tertiary }}>{isOpen ? '⌃' : '⌄'}</Text>
    </TouchableOpacity>
  )
}

export default function SalonEditScreen() {
  const { top, bottom } = useSafeAreaInsets()
  const { salon, isLoading } = useMySalonProfile()
  const { theme } = useTheme()

  const { pickAndUpload: pickLogo, isUploading: isUploadingLogo } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })
  const { pickAndUpload: pickCover, isUploading: isUploadingCover } = useMediaUpload({
    folder: 'uploads',
    type: 'image',
    allowsEditing: true,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isHiring, setIsHiring] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('photos')

  useEffect(() => {
    if (!salon) return
    setName(salon.name)
    setDescription((salon as { description?: string }).description ?? '')
    setSpecialties(salon.specialties)
    setIsHiring((salon as { isHiring?: boolean }).isHiring ?? false)
    const photos = (salon as { photoUrls?: string[] }).photoUrls ?? []
    setLogoUrl(photos[0] ?? null)
    setCoverUrl(photos[1] ?? null)
  }, [salon])

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

  const handleChangeLogo = useCallback(async () => {
    const url = await pickLogo()
    if (!url) return
    setLogoUrl(url)
  }, [pickLogo])

  const handleChangeCover = useCallback(async () => {
    const url = await pickCover()
    if (!url) return
    setCoverUrl(url)
  }, [pickCover])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Salon name is required.')
      return
    }
    setIsSaving(true)
    try {
      const photoUrls = [logoUrl, coverUrl].filter((u): u is string => !!u)
      await salonsApi.updateProfile({
        name: name.trim(),
        description: description.trim() || undefined,
        specialties,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        isHiring,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [name, description, specialties, logoUrl, coverUrl, isHiring])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 15, color: '#D85A30', fontWeight: '500' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>Edit Salon</Text>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Name ─── */}
          <View style={[styles.nameSection, { backgroundColor: theme.bg.card, borderBottomColor: theme.border.subtle }]}>
            <Text style={[styles.fieldLabel, { color: theme.text.tertiary }]}>SALON NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your salon name"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.inlineInput, { color: theme.text.primary, borderBottomColor: theme.border.default }]}
              autoCapitalize="words"
            />
          </View>

          {/* ─── PHOTOS ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Photos"
              subtitle="Cover photo and logo"
              isOpen={openSection === 'photos'}
              onPress={() => toggleSection('photos')}
            />
            {openSection === 'photos' && (
              <View style={styles.sectionBody}>
                {/* Cover photo */}
                <Text style={[styles.fieldLabel, { color: theme.text.tertiary, marginBottom: 10 }]}>COVER PHOTO</Text>
                <TouchableOpacity
                  onPress={() => void handleChangeCover()}
                  disabled={isUploadingCover}
                  activeOpacity={0.8}
                  style={[styles.coverPhoto, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                >
                  {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.coverPhotoImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverPhotoEmpty}>
                      <Text style={{ fontSize: 28, marginBottom: 6 }}>🖼️</Text>
                      <Text style={{ fontSize: 13, color: theme.text.tertiary }}>Tap to add cover photo</Text>
                    </View>
                  )}
                  {isUploadingCover && (
                    <View style={[styles.coverPhotoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Logo */}
                <Text style={[styles.fieldLabel, { color: theme.text.tertiary, marginTop: 20, marginBottom: 10 }]}>LOGO</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => void handleChangeLogo()}
                    disabled={isUploadingLogo}
                    activeOpacity={0.8}
                    style={[styles.logoCircle, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                  >
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.logoCircleImg} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 28 }}>🏪</Text>
                    )}
                    {isUploadingLogo && (
                      <View style={[StyleSheet.absoluteFillObject, { borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }]}>
                        <ActivityIndicator color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Salon Logo</Text>
                    <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>Square image, 200×200px min</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ─── DESCRIPTION ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="About"
              subtitle={description.length > 0 ? description.slice(0, 50) + (description.length > 50 ? '…' : '') : 'Tell workers about your salon'}
              isOpen={openSection === 'about'}
              onPress={() => toggleSection('about')}
            />
            {openSection === 'about' && (
              <View style={styles.sectionBody}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell workers what makes your salon unique, your vibe, clientele..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  maxLength={500}
                  style={[styles.bioInput, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, color: theme.text.primary }]}
                  autoCapitalize="sentences"
                />
                <Text style={{ fontSize: 11, color: description.length > 460 ? '#D85A30' : theme.text.tertiary, textAlign: 'right', marginTop: 4 }}>
                  {description.length}/500
                </Text>
              </View>
            )}
          </View>

          {/* ─── SPECIALTIES ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <SectionHeader
              title="Specialties"
              subtitle={specialties.length > 0 ? specialties.slice(0, 3).join(', ') + (specialties.length > 3 ? ` +${specialties.length - 3}` : '') : 'What services do you offer?'}
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

          {/* ─── HIRING STATUS ─── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                setIsHiring((v) => !v)
              }}
              activeOpacity={0.8}
              style={[
                styles.hiringCard,
                {
                  backgroundColor: isHiring ? 'rgba(216,90,48,0.08)' : theme.bg.elevated,
                  borderColor: isHiring ? '#D85A30' : theme.border.default,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isHiring ? '#D85A30' : theme.text.primary, letterSpacing: -0.3 }}>
                  {isHiring ? 'Currently Hiring' : 'Not Hiring'}
                </Text>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 3 }} numberOfLines={2}>
                  {isHiring
                    ? 'Your salon appears in hiring feeds and workers can apply'
                    : 'Toggle on to appear in the jobs feed and attract talent'}
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  { backgroundColor: isHiring ? '#D85A30' : theme.border.default },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [{ translateX: isHiring ? 20 : 2 }],
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
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
  nameSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  inlineInput: {
    fontSize: 15,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
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
  sectionBody: {
    padding: 16,
  },
  coverPhoto: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverPhotoImg: {
    width: '100%',
    height: '100%',
  },
  coverPhotoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoCircleImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hiringCard: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
})
