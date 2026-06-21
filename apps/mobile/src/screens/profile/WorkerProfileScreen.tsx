import React, { useCallback, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Text, AvailabilityBadge, PortfolioGrid, Skeleton, useTheme } from '@salonin/ui'
import type { PortfolioItem, AvailabilitySchedule } from '@salonin/types'
import { formatExperience } from '@salonin/utils'
import { useWorkerProfile } from '../../hooks/useWorkerProfile'
import { useAuthStore } from '../../store/authStore'
import { messagesApi } from '@salonin/api-client'
import { useCanReview } from '../../hooks/useReviews'
import { useStories } from '../../contexts/StoriesContext'
import { StoryRing } from '../../components/StoryRing'

function formatTime12(t: string): string {
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile, isLoading } = useWorkerProfile(id)
  const currentUser = useAuthStore((s) => s.user)
  const { theme, isDark } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const isOwner = Boolean(currentUser && profile && currentUser.id === profile.userId)
  const [isMessaging, setIsMessaging] = useState(false)
  const { openViewerForUser } = useStories()
  const { canReview, existingReview } = useCanReview(
    !isOwner && currentUser ? profile?.userId : undefined
  )
  const [bioExpanded, setBioExpanded] = useState(false)

  const handleMessage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!currentUser) {
      Alert.alert(
        'Sign in to message',
        'Create a free account to message beauty professionals on My Salon In.',
        [
          { text: 'Create account', onPress: () => router.push('/(auth)/register') },
          { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      )
      return
    }
    if (!profile) return
    setIsMessaging(true)
    try {
      const conv = await messagesApi.createConversation(profile.userId)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(profile.name)}` as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [currentUser, profile])

  const handlePressItem = useCallback((item: PortfolioItem) => {
    router.push((`/worker/portfolio-view?url=${encodeURIComponent(item.mediaUrl)}`) as never)
  }, [])

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <ProfileSkeleton top={top} bottom={bottom} theme={theme} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
        <View style={styles.emptyState}>
          <Text variant="body" color="secondary">Profile not found</Text>
        </View>
      </View>
    )
  }

  const heroBg = theme.bg.elevated

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Floating back button */}
      <View style={[styles.floatingHeader, { top: top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            onPress={() => router.push('/worker/edit')}
            style={[styles.editBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.editBtnText, { color: theme.brand.primary }]}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: !isOwner ? 96 + bottom : 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero background ── */}
        <View style={[styles.heroBg, { backgroundColor: heroBg, marginTop: top }]} />

        {/* ── Profile section (overlapping hero) ── */}
        <View style={[styles.profileSection, { backgroundColor: theme.bg.base }]}>
          <StoryRing userId={profile.userId} size={80} onPress={() => openViewerForUser(profile.userId)}>
            <Avatar
              uri={profile.photoUrl}
              name={profile.name}
              size="xl"
              isVerified={profile.isVerified}
              style={styles.profileAvatar}
            />
          </StoryRing>
          <Text style={[styles.profileName, { color: theme.text.primary }]} numberOfLines={1}>
            {profile.name}
          </Text>
          <Text style={[styles.profileSpecialty, { color: theme.text.secondary }]} numberOfLines={1}>
            {profile.specialties[0] ?? 'Beauty Professional'}{profile.experienceYears > 0 ? ` · ${formatExperience(profile.experienceYears)}` : ''}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#D85A30" />
            <Text style={[styles.profileLocation, { color: theme.text.tertiary }]} numberOfLines={1}>
              {[profile.city, profile.state].filter(Boolean).join(', ') || 'Location not set'}
            </Text>
          </View>
          <View style={styles.availRow}>
            <AvailabilityBadge status={profile.availability} />
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, { borderColor: theme.border.subtle }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text.primary }]}>
                {profile.portfolioItems.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Photos</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text.primary }]}>
                {formatExperience(profile.experienceYears)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Experience</Text>
            </View>
            {profile.isVerified && (
              <>
                <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#1D9E75' }]}>✓</Text>
                  <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Verified</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── About ── */}
        {profile.bio ? (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>About</Text>
            <Text
              style={[styles.bioText, { color: theme.text.secondary }]}
              numberOfLines={bioExpanded ? undefined : 3}
            >
              {profile.bio}
            </Text>
            {profile.bio.length > 120 && (
              <TouchableOpacity onPress={() => setBioExpanded((v) => !v)}>
                <Text style={[styles.showMore, { color: theme.brand.primary }]}>
                  {bioExpanded ? 'Show less' : 'Show more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* ── Specialties ── */}
        {profile.specialties.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>Specialties</Text>
            <View style={styles.pillGrid}>
              {profile.specialties.map((s) => (
                <View key={s} style={[styles.specPill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
                  <Text style={[styles.specPillText, { color: theme.text.secondary }]}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Schedule ── */}
        {profile.availabilitySchedule && profile.availabilitySchedule.days.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>Schedule</Text>
            <View style={styles.pillGrid}>
              {profile.availabilitySchedule.days.map((day) => (
                <View key={day} style={styles.schedDayChip}>
                  <Text style={styles.schedDayText}>{day}</Text>
                </View>
              ))}
            </View>
            <View style={styles.schedTimeRow}>
              <Ionicons name="time-outline" size={14} color="#D85A30" />
              <Text style={[styles.schedTimeText, { color: theme.text.secondary }]}>
                {formatTime12((profile.availabilitySchedule as AvailabilitySchedule).startTime)}
                {' – '}
                {formatTime12((profile.availabilitySchedule as AvailabilitySchedule).endTime)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Reviews ── */}
        {(profile.rating > 0 || canReview) && (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>Reviews</Text>
              {profile.rating > 0 && (
                <TouchableOpacity
                  onPress={() => router.push(`/review/list?userId=${profile.userId}&userName=${encodeURIComponent(profile.name)}&rating=${profile.rating}&reviewCount=${profile.reviewCount}` as never)}
                >
                  <View style={styles.seeAllRow}>
                    <Text style={[styles.showMore, { color: theme.brand.primary }]}>See all</Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.brand.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            {profile.rating > 0 && (
              <Text style={{ fontSize: 14, color: theme.text.secondary }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: theme.text.primary }}>{profile.rating.toFixed(1)}</Text>
                {'  ⭐  '}
                <Text style={{ color: theme.text.tertiary }}>{profile.reviewCount} {profile.reviewCount === 1 ? 'review' : 'reviews'}</Text>
              </Text>
            )}
            {existingReview && (
              <Text style={{ fontSize: 12, color: theme.text.tertiary }}>You reviewed this worker — {existingReview.rating}/5 ⭐</Text>
            )}
          </View>
        )}

        {/* ── Portfolio ── */}
        <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>Portfolio</Text>
            {isOwner && (
              <TouchableOpacity onPress={() => router.push('/worker/portfolio')}>
                <Text style={[styles.showMore, { color: theme.brand.primary }]}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <PortfolioGrid
            items={profile.portfolioItems}
            onPressItem={handlePressItem}
            isLoading={false}
          />
          {profile.portfolioItems.length === 0 && (
            <Text style={[styles.emptyPortfolio, { color: theme.text.tertiary }]}>No portfolio photos yet</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      {!isOwner && (
        <View style={[styles.ctaBar, {
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border.subtle,
          paddingBottom: Math.max(bottom, 16),
        }]}>
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => void handleMessage()}
              disabled={isMessaging}
              style={({ pressed }) => [
                styles.ctaBtn,
                isMessaging && styles.ctaBtnDisabled,
                pressed && { opacity: 0.85 },
                { flex: 1 },
              ]}
            >
              {isMessaging
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={[styles.ctaBtnText, { color: theme.text.inverse }]}>Message</Text>
              }
            </Pressable>
            {canReview && !existingReview && (
              <Pressable
                onPress={() => router.push(`/review/leave?subjectId=${profile.userId}&subjectName=${encodeURIComponent(profile.name)}&subjectPhoto=${encodeURIComponent(profile.photoUrl ?? '')}` as never)}
                style={({ pressed }) => [styles.ctaBtnSecondary, { borderColor: theme.brand.primary }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="star-outline" size={15} color={theme.brand.primary} />
                <Text style={[styles.ctaBtnSecondaryText, { color: theme.brand.primary }]}>Review</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtnSecondary,
                { borderColor: theme.border.default },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="bookmark-outline" size={15} color={theme.text.secondary} />
              <Text style={[styles.ctaBtnSecondaryText, { color: theme.text.secondary }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

interface SkeletonProps { top: number; bottom: number; theme: ReturnType<typeof useTheme>['theme'] }
function ProfileSkeleton({ top, theme }: SkeletonProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.heroBg, { backgroundColor: theme.bg.elevated, marginTop: top }]} />
      <View style={[styles.profileSection, { backgroundColor: theme.bg.base }]}>
        <Skeleton width={80} height={80} radius={40} />
        <View style={{ marginTop: 12, gap: 8, alignItems: 'center' }}>
          <Skeleton width={160} height={22} radius={6} />
          <Skeleton width={120} height={14} radius={5} />
          <Skeleton width={90} height={12} radius={5} />
          <Skeleton width={110} height={24} radius={12} />
        </View>
        <View style={[styles.statsRow, { borderColor: theme.border.subtle, marginTop: 16 }]}>
          <Skeleton width={60} height={32} radius={5} />
          <Skeleton width={60} height={32} radius={5} />
        </View>
      </View>
      <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle, gap: 8 }]}>
        <Skeleton width={60} height={11} radius={5} />
        <Skeleton width="90%" height={13} radius={5} />
        <Skeleton width="70%" height={13} radius={5} />
      </View>
      <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle, gap: 8 }]}>
        <Skeleton width={80} height={11} radius={5} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={80} height={28} radius={14} />
          <Skeleton width={70} height={28} radius={14} />
          <Skeleton width={90} height={28} radius={14} />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  heroBg: {
    height: 140,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    marginTop: -40,
  },
  profileAvatar: {
    borderWidth: 3,
    borderColor: '#D85A30',
    borderRadius: 40,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 12,
    textAlign: 'center',
  },
  profileSpecialty: {
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  profileLocation: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  availRow: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 16,
    alignSelf: 'stretch',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 0.5, height: 30 },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  showMore: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  specPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyPortfolio: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  schedDayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(216,90,48,0.10)',
    borderColor: 'rgba(216,90,48,0.3)',
  },
  schedDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D85A30',
  },
  schedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schedTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  ctaBtnSecondary: {
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  ctaBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
