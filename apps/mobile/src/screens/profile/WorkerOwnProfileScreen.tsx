import React, { useState, useCallback } from 'react'
import { View, ScrollView, Image, TouchableOpacity, Pressable, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, AvailabilityBadge, PortfolioGrid, Skeleton, Button, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { PortfolioItem } from '@salonin/types'
import { Availability } from '@salonin/types'
import { formatExperience } from '@salonin/utils'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMyApplications } from '../../hooks/useJobDetail'
import { authApi, workersApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import * as Haptics from 'expo-haptics'
import { useMediaUpload } from '../../hooks/useMediaUpload'

export default function WorkerOwnProfileScreen() {
  const { profile, isLoading, refetch } = useMyWorkerProfile()
  const { applications } = useMyApplications()
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length
  const { theme } = useTheme()

  const AVAIL_OPTIONS: Array<{ value: Availability; label: string; color: string }> = [
    { value: Availability.NOW, label: 'Available now', color: theme.avail.now },
    { value: Availability.TODAY, label: 'Available today', color: theme.avail.today },
    { value: Availability.WEEKEND, label: 'This weekend', color: theme.avail.weekend },
    { value: Availability.NOT_AVAILABLE, label: 'Not available', color: theme.avail.none },
  ]
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { logout } = useAuth()
  const [showAvailSheet, setShowAvailSheet] = useState(false)
  const [currentAvail, setCurrentAvail] = useState<Availability | null>(null)
  const [optimisticPhoto, setOptimisticPhoto] = useState<string | null>(null)

  const { pickAndUpload, isUploading } = useMediaUpload({ folder: 'avatars', allowsEditing: true })

  const handlePickPhoto = useCallback(async () => {
    const url = await pickAndUpload()
    if (!url) return
    setOptimisticPhoto(url)
    try {
      await workersApi.updateProfile({ photoUrl: url })
    } catch {
      setOptimisticPhoto(null)
      refetch()
    }
  }, [pickAndUpload, refetch])

  const availability = currentAvail ?? profile?.availability ?? Availability.NOT_AVAILABLE

  const handleAvailChange = async (value: Availability) => {
    setCurrentAvail(value)
    setShowAvailSheet(false)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await workersApi.updateAvailability({ availability: value })
    } catch {
      setCurrentAvail(null)
      refetch()
    }
  }

  const handleSignOut = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, portfolio, and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount()
              clearAuth()
              router.replace('/(auth)/login')
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.')
            }
          },
        },
      ],
    )
  }

  const handlePressItem = (item: PortfolioItem) => {
    router.push(`/worker/portfolio-view?url=${encodeURIComponent(item.mediaUrl)}` as never)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <ProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <View style={styles.emptyState}>
          <Text variant="body" color="secondary">Profile not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const photoUrl = optimisticPhoto ?? profile.photoUrl ?? null

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero: blurred bg + circle photo ── */}
        <View style={styles.hero}>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={[StyleSheet.absoluteFillObject, styles.heroBg]}
              blurRadius={22}
              resizeMode="cover"
            />
          ) : null}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: photoUrl ? 'rgba(0,0,0,0.42)' : theme.bg.elevated }]} />

          <TouchableOpacity
            onPress={() => router.push('/worker/edit')}
            style={styles.heroEditBtn}
            activeOpacity={0.8}
          >
            <Text style={[styles.heroEditText, { color: photoUrl ? '#fff' : theme.text.secondary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handlePickPhoto()}
            disabled={isUploading}
            style={styles.avatarWrap}
            activeOpacity={0.85}
          >
            <View style={[styles.avatarCircle, { borderColor: photoUrl ? 'rgba(255,255,255,0.7)' : theme.border.default }]}>
              {isUploading ? (
                <ActivityIndicator color="#D85A30" size="large" />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : null}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: theme.brand.primary }]}>
              <Text style={styles.cameraBadgeText}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Identity ── */}
        <View style={styles.identity}>
          <Text style={[styles.heroName, { color: theme.text.primary }]}>{profile.name}</Text>
          <Text style={[styles.heroSub, { color: theme.text.secondary }]}>
            {[profile.specialties[0], formatExperience(profile.experienceYears)].filter(Boolean).join(' · ')}
          </Text>
          <Pressable
            onPress={() => setShowAvailSheet(true)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }], marginTop: 8 })}
          >
            <AvailabilityBadge status={availability} />
          </Pressable>
        </View>

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={[styles.section, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>ABOUT</Text>
            <Text style={[styles.bodyText, { color: theme.text.secondary }]} numberOfLines={5}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Stats row ── */}
        <View style={[styles.statsRow, { backgroundColor: theme.bg.elevated }]}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>{applications.length}</Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Applied</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border.default }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>{formatExperience(profile.experienceYears)}</Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Experience</Text>
          </View>
        </View>

        {/* ── Specialties ── */}
        {profile.specialties.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>SPECIALTIES</Text>
            <View style={styles.pillRow}>
              {profile.specialties.map((s) => (
                <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                  <Text variant="caption">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Portfolio ── */}
        <View style={styles.portfolioSection}>
          <View style={styles.sectionHeader}>
            <Text variant="title">Portfolio</Text>
            <TouchableOpacity onPress={() => router.push('/worker/portfolio')}>
              <Text variant="caption" color="brand">+ Add</Text>
            </TouchableOpacity>
          </View>
          <PortfolioGrid items={profile.portfolioItems} onPressItem={handlePressItem} isLoading={false} />
        </View>

        {/* ── My Applications ── */}
        <TouchableOpacity
          style={[styles.listRow, { borderColor: theme.border.default, backgroundColor: theme.bg.elevated }]}
          onPress={() => router.push('/worker/applications' as never)}
          activeOpacity={0.8}
        >
          <Text style={[styles.listRowLabel, { color: theme.text.primary }]}>My Applications</Text>
          {pendingCount > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: theme.brand.primary }]}>
              <Text style={[styles.pendingBadgeText, { color: theme.text.inverse }]}>{pendingCount}</Text>
            </View>
          )}
          <Text style={{ color: theme.text.secondary, fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {/* ── Edit Profile ── */}
        <View style={styles.actionSection}>
          <Button variant="secondary" fullWidth onPress={() => router.push('/worker/edit')}>
            Edit Profile
          </Button>
        </View>

        <Pressable onPress={() => void handleSignOut()} style={styles.signOutBtn}>
          <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '500' }}>Sign out</Text>
        </Pressable>

        <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={{ fontSize: 13, color: theme.semantic.error.text, fontWeight: '500' }}>Delete Account</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showAvailSheet} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAvailSheet(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg.elevated }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border.default }]} />
            <Text variant="title" style={styles.sheetTitle}>Set availability</Text>
            {AVAIL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleAvailChange(opt.value)}
                style={({ pressed }) => [
                  styles.sheetOption,
                  { backgroundColor: pressed ? theme.bg.input : 'transparent' },
                ]}
              >
                <View style={[styles.sheetDot, { backgroundColor: opt.color }]} />
                <Text variant="body" style={{ flex: 1 }}>{opt.label}</Text>
                {availability === opt.value && (
                  <Text style={{ color: theme.brand.primary, fontWeight: '700', fontSize: 16 }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

function ProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ height: 240, backgroundColor: theme.bg.elevated, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28 }}>
        <Skeleton width={112} height={112} radius={56} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
        <Skeleton width={160} height={24} radius={6} />
        <Skeleton width={120} height={14} radius={7} />
        <Skeleton width={100} height={22} radius={11} />
      </View>
      <View style={{ marginHorizontal: 16, backgroundColor: theme.bg.elevated, borderRadius: 16, padding: 16, gap: 8 }}>
        <Skeleton width={60} height={11} radius={5} />
        <Skeleton width="90%" height={14} radius={7} />
        <Skeleton width="70%" height={14} radius={7} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 48 },

  hero: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroEditBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroEditText: { fontSize: 15, fontWeight: '600' },

  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  avatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },

  identity: { alignItems: 'center', paddingTop: 16, paddingBottom: 20, paddingHorizontal: 24 },
  heroName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { fontSize: 15, marginTop: 4 },

  section: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  bodyText: { fontSize: 15, lineHeight: 22 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, marginTop: 4 },
  statDivider: { width: StyleSheet.hairlineWidth },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  portfolioSection: { marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listRowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  pendingBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700' },

  actionSection: { marginHorizontal: 16, marginTop: 6 },
  signOutBtn: { marginTop: 24, padding: 16, alignItems: 'center' },
  deleteBtn: { marginTop: 4, padding: 16, alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetTitle: { marginBottom: 16 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, gap: 12 },
  sheetDot: { width: 10, height: 10, borderRadius: 5 },
})
