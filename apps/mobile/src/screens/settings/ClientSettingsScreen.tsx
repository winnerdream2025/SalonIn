import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { clientProfileApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'

export default function ClientSettingsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    clientProfileApi.getMe()
      .then((p) => { setName(p.name ?? ''); setPhone(p.phone ?? '') })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your display name.')
      return
    }
    setIsSaving(true)
    try {
      await clientProfileApi.update({ name: name.trim(), phone: phone.trim() || undefined })
      Alert.alert('Saved', 'Your profile has been updated.')
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [name, phone])

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => { clearAuth(); router.replace('/(auth)/login' as never) },
        },
      ],
    )
  }, [clearAuth])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={12} activeOpacity={0.7}>
          {isSaving
            ? <ActivityIndicator size="small" color="#D85A30" />
            : <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '700' }}>Save</Text>}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#D85A30" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>PROFILE</Text>

          <View style={[styles.fieldRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.secondary, width: 72 }}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.input, { color: theme.text.primary }]}
            />
          </View>

          <View style={[styles.fieldRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.secondary, width: 72 }}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="phone-pad"
              style={[styles.input, { color: theme.text.primary }]}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 12 }]}>ACCOUNT</Text>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.75}
            style={[styles.logoutBtn, { borderColor: '#FF3B30' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: 14,
  },
})
