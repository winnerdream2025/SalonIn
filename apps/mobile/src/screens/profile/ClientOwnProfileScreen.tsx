import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { clientProfileApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import type { ClientProfileData } from '@salonin/api-client'

// ─── Menu row ────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  sublabel,
  onPress,
  iconColor,
  iconBg,
  danger,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  sublabel?: string
  onPress: () => void
  iconColor?: string
  iconBg?: string
  danger?: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const fg = danger ? '#E24B4A' : theme.text.primary
  const iconFg = iconColor ?? (danger ? '#E24B4A' : theme.text.primary)
  const bg = iconBg ?? theme.bg.elevated

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.menuRow, { borderBottomColor: theme.border.subtle }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={17} color={iconFg} />
      </View>
      <View style={styles.menuText}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>{label}</Text>
        {sublabel ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>{sublabel}</Text>
        ) : null}
      </View>
      {!danger && (
        <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
      )}
    </TouchableOpacity>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, theme }: { label: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <Text style={[styles.sectionHeader, { color: theme.text.tertiary }]}>{label}</Text>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClientOwnProfileScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const authUser = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [profile, setProfile] = useState<ClientProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    clientProfileApi.getMe()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleSignOut = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          clearAuth()
          router.replace('/(auth)/login' as never)
        },
      },
    ])
  }, [clearAuth])

  const displayName = profile?.name ?? authUser?.email?.split('@')[0] ?? 'You'
  const email = authUser?.email ?? ''
  const photoUrl = profile?.photoUrl

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.topBarTitle, { color: theme.text.primary }]}>My Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/client-settings' as never)}
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottom + 100 }}
        >
          {/* Identity card */}
          <View style={[styles.heroCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <TouchableOpacity
              onPress={() => router.push('/client-settings' as never)}
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
                  <Text style={{ fontSize: 30, fontWeight: '900', color: theme.brand.primary }}>
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              {/* Camera badge — Booksy style */}
              <View style={[styles.cameraBadge, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
                <Ionicons name="camera" size={11} color={theme.text.secondary} />
              </View>
            </TouchableOpacity>
            <View style={styles.heroText}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
                {displayName}
              </Text>
              {profile?.phone ? (
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>{profile.phone}</Text>
              ) : email ? (
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>{email}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/client-settings' as never)}
              activeOpacity={0.75}
              style={[styles.editBtn, { borderColor: theme.border.default }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Bookings section */}
          <SectionHeader label="MY BOOKINGS" theme={theme} />
          <View style={[styles.menuGroup, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <MenuRow
              icon="calendar"
              label="Upcoming"
              sublabel="Confirmed and pending appointments"
              onPress={() => router.push('/(tabs)/jobs' as never)}
              iconColor="#D85A30"
              iconBg="rgba(216,90,48,0.10)"
              theme={theme}
            />
            <MenuRow
              icon="time-outline"
              label="Past Appointments"
              sublabel="History and receipts"
              onPress={() => router.push({ pathname: '/bookings', params: { tab: 'completed' } } as never)}
              iconColor="#6366F1"
              iconBg="rgba(99,102,241,0.10)"
              theme={theme}
            />
            <MenuRow
              icon="star-outline"
              label="My Reviews"
              sublabel="Reviews you've left for pros"
              onPress={() => {
                const uid = authUser?.id ?? ''
                const uname = encodeURIComponent(displayName)
                router.push(`/review/list?userId=${uid}&userName=${uname}&rating=0&reviewCount=0` as never)
              }}
              iconColor="#EF9F27"
              iconBg="rgba(239,159,39,0.10)"
              theme={theme}
            />
          </View>

          {/* Discover section */}
          <SectionHeader label="DISCOVER" theme={theme} />
          <View style={[styles.menuGroup, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <MenuRow
              icon="bookmark"
              label="Saved Stylists"
              sublabel="Your bookmarked pros"
              onPress={() => router.push('/worker/saved' as never)}
              iconColor="#1D9E75"
              iconBg="rgba(29,158,117,0.10)"
              theme={theme}
            />
            <MenuRow
              icon="color-palette-outline"
              label="Preferred Services"
              sublabel="Update your beauty preferences"
              onPress={() => router.push('/category-select' as never)}
              iconColor="#D85A30"
              iconBg="rgba(216,90,48,0.10)"
              theme={theme}
            />
          </View>

          {/* Account section */}
          <SectionHeader label="ACCOUNT" theme={theme} />
          <View style={[styles.menuGroup, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <MenuRow
              icon="person-outline"
              label="Edit Profile"
              onPress={() => router.push('/client-settings' as never)}
              theme={theme}
            />
            <MenuRow
              icon="card-outline"
              label="Payment History"
              onPress={() => router.push('/payment-history' as never)}
              theme={theme}
            />
            <MenuRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => router.push('/notification-prefs' as never)}
              theme={theme}
            />
          </View>

          {/* Sign out */}
          <View style={[styles.menuGroup, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle, marginTop: 20 }]}>
            <MenuRow
              icon="log-out-outline"
              label="Log Out"
              onPress={handleSignOut}
              danger
              theme={theme}
            />
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  editBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  menuGroup: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
})
