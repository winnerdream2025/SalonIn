import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, Skeleton, JobPostCard, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useSalonProfile } from '../../src/hooks/useSalonProfile'
import { useAuthStore } from '../../src/store/authStore'
import { messagesApi } from '@salonin/api-client'
import { Role } from '@salonin/types'
import { useCanReview } from '../../src/hooks/useReviews'
import { useStories } from '../../src/contexts/StoriesContext'

export default function SalonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { salon, jobs, isLoading, error, refetch } = useSalonProfile(id)
  const currentUser = useAuthStore((s) => s.user)
  const { theme } = useTheme()
  const { storyMap, openViewerForUser } = useStories()

  const isOwner = Boolean(
    currentUser &&
    salon &&
    currentUser.role === Role.SALON &&
    salon.user?.id === currentUser.id
  )

  const [isMessaging, setIsMessaging] = useState(false)
  const { canReview, existingReview } = useCanReview(
    !isOwner && currentUser ? salon?.userId : undefined
  )

  const handleMessage = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Sign in required', 'Sign in to message this salon.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ])
      return
    }
    if (!salon) return
    setIsMessaging(true)
    try {
      const conv = await messagesApi.createConversation(salon.userId)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(salon.name)}` as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [currentUser, salon])

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
        <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
            <Text variant="body" color="brand">‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter} />
          <View style={styles.headerSide} />
        </View>
        <View style={styles.errorState}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text variant="title" style={{ textAlign: 'center' }}>Something went wrong</Text>
          <Text variant="body" color="secondary" style={styles.errorText}>
            {error?.message ?? 'Salon not found'}
          </Text>
          <Button variant="secondary" onPress={refetch}>Try again</Button>
        </View>
      </SafeAreaView>
    )
  }

  const firstPhoto = salon.photoUrls[0] ?? null
  const salonStory = storyMap.get(salon.userId)
  const hasSalonStory = salonStory?.hasStory ?? false
  const salonStoryUnseen = salonStory?.hasUnseen ?? false
  const photoCount = salon.photoUrls.length

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text variant="body" color="brand">‹ Back</Text>
        </TouchableOpacity>
        <Text variant="title" numberOfLines={1} style={styles.headerCenter}>{salon.name}</Text>
        {isOwner ? (
          <TouchableOpacity onPress={() => router.push('/salon/edit' as never)} style={styles.headerSide}>
            <Text variant="caption" color="brand" style={{ textAlign: 'right' }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => void handleMessage()}
            disabled={isMessaging}
            style={styles.headerSide}
          >
            {isMessaging
              ? <ActivityIndicator size="small" color={theme.brand.primary} />
              : <Text variant="caption" color="brand" style={{ textAlign: 'right' }}>Message</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero photo */}
        <View style={[styles.hero, { backgroundColor: theme.bg.elevated }]}>
          {firstPhoto ? (
            <>
              <Image source={{ uri: firstPhoto }} style={styles.heroImage} resizeMode="cover" />
              {photoCount > 1 && (
                <View style={[styles.photoCount, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                  <Text variant="caption" style={{ color: theme.text.inverse }}>
                    +{photoCount - 1} photos
                  </Text>
                </View>
              )}
              {hasSalonStory && (
                <TouchableOpacity
                  onPress={() => openViewerForUser(salon.userId)}
                  style={[styles.storyBtn, { borderColor: salonStoryUnseen ? '#D85A30' : '#888' }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={salonStoryUnseen ? 'play-circle' : 'play-circle-outline'} size={20} color="#fff" />
                </TouchableOpacity>
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

        {/* Identity */}
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

        {/* Specialties */}
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

        {/* Reviews summary */}
        {(salon.rating > 0 || canReview) && (
          <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
            <Text variant="label" color="secondary" style={styles.cardLabel}>REVIEWS</Text>
            {salon.rating > 0 && (
              <TouchableOpacity
                onPress={() => router.push(`/review/list?userId=${salon.userId}&userName=${encodeURIComponent(salon.name)}&rating=${salon.rating}&reviewCount=${salon.reviewCount}` as never)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                  {'⭐'.repeat(Math.round(salon.rating as number))}{'☆'.repeat(5 - Math.round(salon.rating as number))}{'  '}
                  <Text style={{ fontWeight: '700', color: theme.text.primary }}>{(salon.rating as number).toFixed(1)}</Text>
                  {'  '}
                  <Text style={{ color: theme.brand.primary }}>{salon.reviewCount} reviews →</Text>
                </Text>
              </TouchableOpacity>
            )}
            {canReview && !existingReview && (
              <TouchableOpacity
                onPress={() => router.push(`/review/leave?subjectId=${salon.userId}&subjectName=${encodeURIComponent(salon.name)}&subjectPhoto=${encodeURIComponent(salon.photoUrls[0] ?? '')}` as never)}
                style={[styles.reviewBtn, { borderColor: theme.brand.primary }]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.brand.primary }}>⭐  Leave a Review</Text>
              </TouchableOpacity>
            )}
            {existingReview && (
              <Text style={{ fontSize: 12, color: theme.text.tertiary }}>You reviewed this salon — {existingReview.rating}/5 ⭐</Text>
            )}
          </View>
        )}

        {/* Active job posts */}
        <View style={styles.jobsSection}>
          <Text variant="title" style={styles.jobsTitle}>Open Positions</Text>

          {jobs.length === 0 ? (
            <View style={[styles.emptyJobs, { backgroundColor: theme.bg.elevated }]}>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {salon.isHiring ? 'Job listings coming soon.' : 'No open positions at this time.'}
              </Text>
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
      </ScrollView>
    </SafeAreaView>
  )
}

function SalonProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Skeleton width="100%" height={220} radius={0} />
      <View style={styles.identity}>
        <Skeleton width={200} height={24} radius={8} />
        <View style={styles.nameRow}>
          <Skeleton width={80} height={20} radius={10} />
          <Skeleton width={60} height={20} radius={10} />
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: theme.bg.elevated }]}>
        <Skeleton width={100} height={12} radius={6} />
        <View style={styles.pillRow}>
          <Skeleton width={70} height={24} radius={12} />
          <Skeleton width={60} height={24} radius={12} />
          <Skeleton width={80} height={24} radius={12} />
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
  headerSide: { width: 60 },
  headerCenter: { flex: 1, textAlign: 'center' },
  content: { paddingBottom: 100 },
  hero: {
    height: 220,
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
  storyBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
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
  jobsTitle: { marginBottom: 4 },
  jobCardWrap: { marginBottom: 8 },
  emptyJobs: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  reviewBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorText: { textAlign: 'center' },
})
