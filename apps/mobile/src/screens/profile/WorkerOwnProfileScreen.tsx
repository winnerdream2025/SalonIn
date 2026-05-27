import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, Pressable, StyleSheet, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Avatar, Text, AvailabilityBadge, PortfolioGrid, Skeleton, Button, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { PortfolioItem } from '@salonin/types'
import { Availability } from '@salonin/types'
import { formatExperience } from '@salonin/utils'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { authApi, workersApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import * as Haptics from 'expo-haptics'

const AVAIL_OPTIONS: Array<{ value: Availability; label: string; color: string }> = [
  { value: Availability.NOW, label: 'Available now', color: '#1D9E75' },
  { value: Availability.TODAY, label: 'Available today', color: '#378ADD' },
  { value: Availability.WEEKEND, label: 'This weekend', color: '#EF9F27' },
  { value: Availability.NOT_AVAILABLE, label: 'Not available', color: '#555555' },
]

export default function WorkerOwnProfileScreen() {
  const { profile, isLoading, refetch } = useMyWorkerProfile()
  const { theme } = useTheme()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [showAvailSheet, setShowAvailSheet] = useState(false)
  const [currentAvail, setCurrentAvail] = useState<Availability | null>(null)

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

  const handleSignOut = () => {
    clearAuth()
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
    if (item.caption) Alert.alert(item.caption)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <ProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.emptyState}>
          <Text variant="body" color="secondary">Profile not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text variant="title" style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => router.push('/worker/edit')} style={styles.editBtn}>
          <Text variant="caption" color="brand">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar uri={profile.photoUrl} name={profile.name} size="xl" />
          <Text variant="heading" style={styles.heroName}>{profile.name}</Text>
          <Pressable
            onPress={() => setShowAvailSheet(true)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
          >
            <AvailabilityBadge status={availability} />
          </Pressable>
        </View>

        {profile.bio ? (
          <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
            <Text variant="body" color="secondary">{profile.bio}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
          <Text variant="label" color="secondary" style={styles.cardLabel}>EXPERIENCE</Text>
          <Text variant="body">{formatExperience(profile.experienceYears)}</Text>
          {profile.specialties.length > 0 && (
            <View style={styles.pillRow}>
              {profile.specialties.map((s) => (
                <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                  <Text variant="caption">{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.portfolioSection}>
          <View style={styles.portfolioHeader}>
            <Text variant="title">Portfolio</Text>
            <TouchableOpacity onPress={() => router.push('/worker/portfolio')}>
              <Text variant="caption" color="brand">+ Add</Text>
            </TouchableOpacity>
          </View>
          <PortfolioGrid
            items={profile.portfolioItems}
            onPressItem={handlePressItem}
            isLoading={false}
          />
        </View>

        <View style={styles.editSection}>
          <Button variant="secondary" fullWidth onPress={() => router.push('/worker/edit')}>
            Edit Profile
          </Button>
        </View>

        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '500' }}>
            Sign out
          </Text>
        </Pressable>

        <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={{ fontSize: 13, color: theme.semantic.error.text, fontWeight: '500' }}>
            Delete Account
          </Text>
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
                  <Text style={{ color: '#D85A30', fontWeight: '700', fontSize: 16 }}>✓</Text>
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
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Skeleton width={80} height={80} radius={40} />
        <Skeleton width={160} height={24} radius={6} />
        <Skeleton width={100} height={20} radius={10} />
      </View>
      <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
        <Skeleton width="90%" height={14} radius={7} />
        <Skeleton width="70%" height={14} radius={7} />
      </View>
      <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
        <Skeleton width={120} height={12} radius={6} />
        <Skeleton width={80} height={14} radius={7} />
      </View>
    </ScrollView>
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
  headerTitle: { flex: 1 },
  editBtn: { paddingLeft: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  hero: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  heroName: { marginTop: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 },
  cardLabel: { letterSpacing: 0.8, marginBottom: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  portfolioSection: { marginTop: 8 },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editSection: { marginTop: 16 },
  signOutBtn: { marginTop: 24, padding: 16, alignItems: 'center' },
  deleteBtn: { marginTop: 8, padding: 16, alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: { marginBottom: 16 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  sheetDot: { width: 10, height: 10, borderRadius: 5 },
})
