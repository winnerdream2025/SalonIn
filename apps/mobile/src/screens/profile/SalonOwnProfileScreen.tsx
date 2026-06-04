import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, Button, Skeleton, JobPostCard, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useMySalonProfile } from '../../hooks/useMySalonProfile'
import { authApi, salonsApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import * as Haptics from 'expo-haptics'

export default function SalonOwnProfileScreen() {
  const { salon, jobs, isLoading, error, refetch } = useMySalonProfile()
  const { theme } = useTheme()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { logout } = useAuth()
  const [hiringOverride, setHiringOverride] = useState<boolean | null>(null)

  const isHiring = hiringOverride ?? salon?.isHiring ?? false

  const handleToggleHiring = async () => {
    const newVal = !isHiring
    setHiringOverride(newVal)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await salonsApi.setHiringStatus(newVal)
    } catch {
      setHiringOverride(null)
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

  const handlePressJob = (job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <SalonProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <View style={styles.errorState}>
          <Text variant="body" color="secondary" style={styles.errorText}>
            {error?.message ?? 'Salon profile not found'}
          </Text>
          <Button variant="secondary" onPress={refetch}>Try again</Button>
        </View>
      </SafeAreaView>
    )
  }

  const firstPhoto = salon.photoUrls[0] ?? null

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Cover + Logo overlap ── */}
        <View style={styles.cover}>
          {firstPhoto ? (
            <Image
              source={{ uri: firstPhoto }}
              style={[StyleSheet.absoluteFillObject, styles.coverBg]}
              blurRadius={14}
              resizeMode="cover"
            />
          ) : null}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: firstPhoto ? 'rgba(0,0,0,0.38)' : theme.bg.elevated }]} />

          <TouchableOpacity
            style={styles.heroEditBtn}
            onPress={() => router.push('/salon/edit' as never)}
            activeOpacity={0.8}
          >
            <Text style={[styles.heroEditText, { color: firstPhoto ? '#fff' : theme.text.secondary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Logo circle overlapping cover */}
        <View style={styles.logoArea}>
          <TouchableOpacity
            style={styles.logoWrap}
            onPress={() => router.push('/salon/edit' as never)}
            activeOpacity={0.85}
          >
            <View style={[styles.logoCircle, { borderColor: firstPhoto ? 'rgba(255,255,255,0.7)' : theme.border.default, backgroundColor: theme.bg.elevated }]}>
              {firstPhoto ? (
                <Image source={{ uri: firstPhoto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <Text style={[styles.logoInitial, { color: theme.text.secondary }]}>
                  {salon.name[0]?.toUpperCase() ?? 'S'}
                </Text>
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: theme.brand.primary }]}>
              <Text style={styles.cameraBadgeText}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Identity ── */}
        <View style={styles.identity}>
          <Text style={[styles.salonName, { color: theme.text.primary }]}>{salon.name}</Text>

          <View style={styles.pillsRow}>
            {salon.isVerified && (
              <View style={[styles.badge, { backgroundColor: 'rgba(29,158,117,0.15)' }]}>
                <Text style={{ fontSize: 12, color: theme.avail.now, fontWeight: '600' }}>✓ Verified</Text>
              </View>
            )}
            <Pressable
              onPress={handleToggleHiring}
              style={({ pressed }) => [
                styles.badge,
                {
                  backgroundColor: isHiring ? 'rgba(216,90,48,0.15)' : 'rgba(85,85,85,0.12)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <Text style={{ fontSize: 12, color: isHiring ? theme.brand.primary : theme.avail.none, fontWeight: '700' }}>
                {isHiring ? 'Hiring now' : 'Not hiring'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Specialties ── */}
        {salon.specialties.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>SPECIALTIES</Text>
            <View style={styles.pillRow}>
              {salon.specialties.map((s) => (
                <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                  <Text variant="caption">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Open Positions ── */}
        <View style={styles.jobsSection}>
          <View style={styles.jobsHeader}>
            <Text variant="title">Open Positions</Text>
            <TouchableOpacity onPress={() => router.push('/jobs/create')}>
              <Text variant="caption" color="brand">+ Post job</Text>
            </TouchableOpacity>
          </View>

          {jobs.length === 0 ? (
            <View style={[styles.emptyJobs, { backgroundColor: theme.bg.elevated }]}>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                No open positions yet.
              </Text>
              <Button variant="primary" onPress={() => router.push('/jobs/create')}>
                Post your first job
              </Button>
            </View>
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.jobCardWrap}>
                  <JobPostCard job={item} onPress={() => handlePressJob(item)} />
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* ── Edit Profile ── */}
        <View style={styles.actionSection}>
          <Button variant="secondary" fullWidth onPress={() => router.push('/salon/edit' as never)}>
            Edit Salon
          </Button>
        </View>

        <Pressable onPress={() => void handleSignOut()} style={styles.signOutBtn}>
          <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '500' }}>Sign out</Text>
        </Pressable>

        <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={{ fontSize: 13, color: theme.semantic.error.text, fontWeight: '500' }}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function SalonProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ height: 160, backgroundColor: theme.bg.elevated }} />
      <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 8 }}>
        <Skeleton width={80} height={80} radius={40} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
        <Skeleton width={160} height={24} radius={6} />
        <Skeleton width={100} height={22} radius={11} />
      </View>
      <View style={{ marginHorizontal: 16, backgroundColor: theme.bg.elevated, borderRadius: 16, padding: 16, gap: 8, marginBottom: 10 }}>
        <Skeleton width={60} height={11} radius={5} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width={70} height={24} radius={12} />
          <Skeleton width={60} height={24} radius={12} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Skeleton width={140} height={20} radius={8} />
        <Skeleton width="100%" height={80} radius={16} />
        <Skeleton width="100%" height={80} radius={16} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 48 },

  cover: {
    height: 160,
    overflow: 'hidden',
    position: 'relative',
  },
  coverBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroEditBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroEditText: { fontSize: 14, fontWeight: '600' },

  logoArea: { alignItems: 'center', marginTop: -40, marginBottom: 4 },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: { fontSize: 32, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },

  identity: { alignItems: 'center', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 24, gap: 8 },
  salonName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  section: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  jobsSection: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobCardWrap: { marginBottom: 8 },
  emptyJobs: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 16 },

  actionSection: { paddingHorizontal: 16, marginTop: 8 },
  signOutBtn: { marginTop: 24, padding: 16, alignItems: 'center' },
  deleteBtn: { marginTop: 4, padding: 16, alignItems: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  errorText: { textAlign: 'center' },
})
