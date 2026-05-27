import React from 'react'
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
import { authApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import * as Haptics from 'expo-haptics'

export default function SalonOwnProfileScreen() {
  const { salon, jobs, isLoading, error, refetch } = useMySalonProfile()
  const { theme } = useTheme()
  const clearAuth = useAuthStore((s) => s.clearAuth)

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
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <SalonProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
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
  const photoCount = salon.photoUrls.length

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text variant="title" style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => router.push('/salon/edit' as never)} style={styles.editBtn}>
          <Text variant="caption" color="brand">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.bg.elevated }]}>
          {firstPhoto ? (
            <>
              <Image source={{ uri: firstPhoto }} style={styles.heroImage} resizeMode="cover" />
              {photoCount > 1 && (
                <View style={[styles.photoCount, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                  <Text variant="caption" style={{ color: '#FFFFFF' }}>
                    +{photoCount - 1} photos
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: theme.bg.input }]}>
              <Text variant="heading" style={{ color: theme.text.secondary, fontSize: 48 }}>
                {salon.name[0]?.toUpperCase() ?? 'S'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text variant="heading" style={styles.salonName}>{salon.name}</Text>
            {salon.isVerified && (
              <View style={[styles.badge, { backgroundColor: 'rgba(29,158,117,0.15)' }]}>
                <Text variant="caption" style={{ color: '#1D9E75', fontWeight: '600' }}>✓ Verified</Text>
              </View>
            )}
            {salon.isHiring && (
              <View style={[styles.badge, { backgroundColor: 'rgba(216,90,48,0.15)' }]}>
                <Text variant="caption" style={{ color: '#D85A30', fontWeight: '600' }}>Hiring</Text>
              </View>
            )}
          </View>
        </View>

        {salon.specialties.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
            <Text variant="label" color="secondary" style={styles.cardLabel}>SPECIALTIES</Text>
            <View style={styles.pillRow}>
              {salon.specialties.map((s) => (
                <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                  <Text variant="caption">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

        <View style={styles.editSection}>
          <Button variant="secondary" fullWidth onPress={() => router.push('/salon/edit' as never)}>
            Edit Profile
          </Button>
        </View>

        <Pressable onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={{ fontSize: 13, color: theme.semantic.error.text, fontWeight: '500' }}>
            Delete Account
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function SalonProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Skeleton width="100%" height={200} radius={0} />
      <View style={styles.identity}>
        <Skeleton width={200} height={24} radius={8} />
      </View>
      <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
        <Skeleton width={100} height={12} radius={6} />
        <View style={styles.pillRow}>
          <Skeleton width={70} height={24} radius={12} />
          <Skeleton width={60} height={24} radius={12} />
        </View>
      </View>
      <View style={styles.jobsSection}>
        <Skeleton width={140} height={20} radius={8} />
        <View style={styles.jobCardWrap}><Skeleton width="100%" height={70} radius={16} /></View>
        <View style={styles.jobCardWrap}><Skeleton width="100%" height={70} radius={16} /></View>
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
  content: { paddingBottom: 100 },
  hero: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  identity: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  salonName: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardLabel: { letterSpacing: 0.8, marginBottom: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  jobsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobCardWrap: { marginBottom: 8 },
  emptyJobs: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  editSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  deleteBtn: { marginTop: 32, padding: 16, alignItems: 'center' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorText: { textAlign: 'center' },
})
