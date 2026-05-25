import React, { useState, useEffect, useCallback } from 'react'
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
import { Avatar, Text, Input, Button, useTheme } from '@salonin/ui'
import { Availability } from '@salonin/types'
import { workersApi } from '@salonin/api-client'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMediaUpload } from '../../hooks/useMediaUpload'

const AVAILABILITY_OPTIONS: Availability[] = [
  Availability.NOW,
  Availability.TODAY,
  Availability.WEEKEND,
  Availability.NOT_AVAILABLE,
]

const AVAIL_LABELS: Record<Availability, string> = {
  [Availability.NOW]: 'Available Now',
  [Availability.TODAY]: 'Today',
  [Availability.WEEKEND]: 'Weekend',
  [Availability.NOT_AVAILABLE]: 'Off',
}

export default function EditProfileScreen() {
  const { profile, isLoading } = useMyWorkerProfile()
  const { theme } = useTheme()
  const { pickAndUpload: pickAvatar, isUploading: isUploadingAvatar } = useMediaUpload({
    folder: 'avatars',
    type: 'image',
    allowsEditing: true,
  })

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [experienceYears, setExperienceYears] = useState('0')
  const [availability, setAvailability] = useState<Availability>(Availability.NOT_AVAILABLE)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setBio(profile.bio ?? '')
    setSpecialtiesText(profile.specialties.join(', '))
    setExperienceYears(String(profile.experienceYears))
    setAvailability(profile.availability)
    setPhotoUrl(profile.photoUrl)
  }, [profile])

  const handleChangePhoto = useCallback(async () => {
    const url = await pickAvatar()
    if (!url) return
    setPhotoUrl(url)
    await workersApi.updateProfile({ photoUrl: url })
  }, [pickAvatar])

  const handleSave = useCallback(async () => {
    const years = parseInt(experienceYears, 10)
    if (isNaN(years) || years < 0) {
      Alert.alert('Invalid value', 'Experience years must be a positive number.')
      return
    }
    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setIsSaving(true)
    try {
      await workersApi.updateProfile({ name, bio: bio || undefined, specialties, experienceYears: years })
      await workersApi.updateAvailability({ availability })
      router.back()
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [name, bio, specialtiesText, experienceYears, availability])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text variant="body" color="brand">Cancel</Text>
        </TouchableOpacity>
        <Text variant="title" style={styles.headerCenter}>Edit Profile</Text>
        <View style={styles.headerSide} />
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
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleChangePhoto}
            disabled={isUploadingAvatar || isLoading}
          >
            <Avatar uri={photoUrl} name={name || 'U'} size="xl" />
            <Text variant="caption" color="brand" style={styles.changePhoto}>
              {isUploadingAvatar ? 'Uploading…' : 'Change Photo'}
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
            />

            <Input
              label="Specialties (comma separated)"
              value={specialtiesText}
              onChangeText={setSpecialtiesText}
              placeholder="e.g. Haircut, Color, Balayage"
              autoCapitalize="words"
            />

            <Input
              label="Years of experience"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="number-pad"
            />

            <Text variant="label" color="secondary" style={styles.availLabel}>
              AVAILABILITY
            </Text>
            <View style={styles.availRow}>
              {AVAILABILITY_OPTIONS.map((opt) => {
                const active = availability === opt
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setAvailability(opt)}
                    style={[
                      styles.availPill,
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
                      {AVAIL_LABELS[opt]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.saveBtn}>
            <Button
              variant="primary"
              fullWidth
              loading={isSaving || isLoading}
              onPress={handleSave}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 60 },
  headerCenter: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 80 },
  avatarWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  changePhoto: { marginTop: 4 },
  form: { gap: 16 },
  availLabel: { letterSpacing: 0.8, marginBottom: 8 },
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtn: { marginTop: 32 },
})
