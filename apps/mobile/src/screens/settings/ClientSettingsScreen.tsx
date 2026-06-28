import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { clientProfileApi, authApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useMediaUpload } from '../../hooks/useMediaUpload'

export default function ClientSettingsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const authUser = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { pickAndUpload, isUploading } = useMediaUpload({ folder: 'avatars', allowsEditing: true })

  useEffect(() => {
    clientProfileApi.getMe()
      .then((p) => { setName(p.name ?? ''); setPhone(p.phone ?? ''); setPhotoUrl(p.photoUrl) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handlePickPhoto = useCallback(async () => {
    const url = await pickAndUpload()
    if (!url) return
    setPhotoUrl(url)
    try { await clientProfileApi.update({ photoUrl: url }) }
    catch { setPhotoUrl(null) }
  }, [pickAndUpload])

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

  const handleResetPassword = useCallback(() => {
    const email = authUser?.email
    if (!email) return
    Alert.alert(
      'Reset Password',
      `We\'ll send a password reset link to ${email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            try {
              await authApi.forgotPassword(email)
              Alert.alert('Email sent', 'Check your inbox for the reset link.')
            } catch {
              Alert.alert('Error', 'Could not send email. Try again later.')
            }
          },
        },
      ],
    )
  }, [authUser])

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount()
              clearAuth()
              router.replace('/(auth)/login' as never)
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.')
            }
          },
        },
      ],
    )
  }, [clearAuth])

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

          {/* Avatar */}
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.75} style={styles.avatarRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.bg.surface }]}>
                <Ionicons name="person-outline" size={32} color={theme.text.tertiary} />
              </View>
            )}
            {isUploading
              ? <ActivityIndicator size="small" color="#D85A30" style={{ marginLeft: 14 }} />
              : <Text style={{ color: '#D85A30', fontSize: 14, fontWeight: '600', marginLeft: 14 }}>Change Photo</Text>}
          </TouchableOpacity>

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
            onPress={handleResetPassword}
            activeOpacity={0.75}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
          >
            <Ionicons name="key-outline" size={18} color={theme.text.primary} />
            <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}>Reset Password</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/payment-history' as never)}
            activeOpacity={0.75}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
          >
            <Ionicons name="receipt-outline" size={18} color={theme.text.primary} />
            <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}>Payment History</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notification-prefs' as never)}
            activeOpacity={0.75}
            style={[styles.actionBtn, { borderColor: theme.border.default }]}
          >
            <Ionicons name="notifications-outline" size={18} color={theme.text.primary} />
            <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.75}
            style={[styles.logoutBtn, { borderColor: '#FF3B30' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            activeOpacity={0.75}
            style={[styles.logoutBtn, { borderColor: '#DC2626', marginTop: 4 }]}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={{ color: '#DC2626', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>Delete Account</Text>
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
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
})
