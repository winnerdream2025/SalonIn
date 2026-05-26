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
import { Text, Input, Button, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'
import { useMySalonProfile } from '../../hooks/useMySalonProfile'

export default function SalonEditScreen() {
  const { salon, isLoading } = useMySalonProfile()
  const { theme } = useTheme()

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [address, setAddress] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!salon) return
    setName(salon.name)
    setSpecialtiesText(salon.specialties.join(', '))
  }, [salon])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Invalid value', 'Salon name is required.')
      return
    }
    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setIsSaving(true)
    try {
      await salonsApi.updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        specialties,
        address: address.trim() || undefined,
      })
      router.back()
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [name, bio, specialtiesText, address])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text variant="body" color="brand">Cancel</Text>
        </TouchableOpacity>
        <Text variant="title" style={styles.headerCenter}>Edit Salon</Text>
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
          <View style={styles.form}>
            <Input
              label="Salon Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Description"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              placeholder="Tell workers what makes your salon unique..."
            />

            <Input
              label="Specialties (comma separated)"
              value={specialtiesText}
              onChangeText={setSpecialtiesText}
              placeholder="e.g. Haircut, Color, Balayage"
              autoCapitalize="words"
            />

            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              placeholder="e.g. 123 Main St, Washington DC"
            />
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
  content: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 24 },
  form: { gap: 16 },
  saveBtn: { marginTop: 32 },
})
