import React, { useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Avatar, Text, AvailabilityBadge, PortfolioGrid, Skeleton, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { PortfolioItem } from '@salonin/types'
import { formatExperience } from '@salonin/utils'
import { useWorkerProfile } from '../../hooks/useWorkerProfile'
import { useAuthStore } from '../../store/authStore'

export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile, isLoading } = useWorkerProfile(id)
  const currentUser = useAuthStore((s) => s.user)
  const { theme } = useTheme()

  const isOwner = Boolean(currentUser && profile && currentUser.id === profile.userId)
  const { bottom } = useSafeAreaInsets()

  const handleMessage = useCallback(() => {
    if (currentUser) {
      router.push(`/chat/${id}`)
      return
    }
    Alert.alert(
      'Sign in to message',
      'Create a free account to message beauty professionals on Salonin.',
      [
        { text: 'Create account', onPress: () => router.push('/(auth)/register') },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }, [currentUser, id])

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
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text variant="body" color="brand">‹ Back</Text>
        </TouchableOpacity>
        <Text variant="title" numberOfLines={1} style={styles.headerCenter}>{profile.name}</Text>
        {isOwner ? (
          <TouchableOpacity onPress={() => router.push('/worker/edit')} style={styles.headerSide}>
            <Text variant="caption" color="brand">Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: !isOwner && profile ? 80 + bottom : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Avatar uri={profile.photoUrl} name={profile.name} size="xl" />
          <Text variant="heading" style={styles.heroName}>{profile.name}</Text>
          <AvailabilityBadge status={profile.availability} />
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
            {isOwner && (
              <TouchableOpacity onPress={() => router.push('/worker/portfolio')}>
                <Text variant="caption" color="brand">+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <PortfolioGrid
            items={profile.portfolioItems}
            onPressItem={handlePressItem}
            isLoading={false}
          />
        </View>
      </ScrollView>

      {!isOwner && profile && (
        <View style={[styles.messageBar, { paddingBottom: bottom + 12 }]}>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={handleMessage}
            activeOpacity={0.85}
          >
            <Text variant="body" style={styles.messageBtnText}>Send message</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerSide: { width: 60 },
  headerCenter: { flex: 1, textAlign: 'center' },
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  messageBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
})
