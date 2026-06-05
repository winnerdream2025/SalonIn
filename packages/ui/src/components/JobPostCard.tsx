import React, { useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { JobPostCardData } from '@salonin/types'
import { isJobExpired } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { Avatar } from '../primitives/Avatar'
import { useTheme } from '../hooks/useTheme'

export interface JobPostCardProps {
  job: JobPostCardData
  onPress: () => void
  isLoading?: boolean
  onApply?: () => void
  onMessage?: () => void
  onSave?: () => void
  isSaved?: boolean
}

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
}

function daysUntil(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
}

export function JobPostCard({
  job,
  onPress,
  isLoading = false,
  onApply,
  onMessage,
  onSave,
  isSaved = false,
}: JobPostCardProps) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current

  const animIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()
  }, [scale])

  const animOut = useCallback(() => {
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }, [scale])

  if (isLoading) return <JobPostCardSkeleton />

  const expired = isJobExpired(job.expiresAt)
  const typeLabel = TYPE_LABEL[job.type] ?? job.type
  const days = daysUntil(job.expiresAt)
  const expiryColor = expired
    ? theme.semantic.error.text
    : days <= 2
      ? theme.semantic.error.text
      : theme.text.tertiary
  const expiryStr = expired ? 'Expired' : `Expires in ${days}d`

  const hasPortfolio = (job.portfolioPhotoUrls?.length ?? 0) > 0
  const portfolioCount = job.portfolioPhotoUrls?.length ?? 0

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[styles.card, {
          backgroundColor: theme.bg.card,
          shadowColor: '#000000',
        }]}
      >
        {/* ── Top row: salon logo + name/meta + badge + bookmark ── */}
        <View style={styles.topRow}>
          <Avatar uri={job.salonPhotoUrl} name={job.salonName} size="lg" />
          <View style={styles.topInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.salonName, { color: theme.text.primary }]} numberOfLines={1}>
                {job.salonName}
              </Text>
              {job.salonRating != null && (
                <Text style={[styles.metaText, { color: theme.text.secondary }]}>
                  {' · '}{job.salonRating.toFixed(1)} ★
                  {job.salonReviewCount != null && ` (${job.salonReviewCount})`}
                </Text>
              )}
            </View>
            <Text style={[styles.metaText, { color: theme.text.secondary }]} numberOfLines={1}>
              {job.cityId.toUpperCase()}
              {job.salonHiringCount != null && `  ·  ${job.salonHiringCount} hiring this month`}
            </Text>
          </View>
          <View style={styles.topRight}>
            {job.isUrgent && !expired && (
              <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
                <Text style={styles.badgeText}>⚡ Urgent</Text>
              </View>
            )}
            {onSave && (
              <Pressable onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 18, color: isSaved ? theme.brand.primary : theme.text.tertiary }}>
                  {isSaved ? '🔖' : '🔖'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Middle: salon photo + title + pills + portfolio ── */}
        <View style={styles.middleRow}>
          {job.salonPhotoUrl && (
            <Image source={{ uri: job.salonPhotoUrl }} style={styles.salonPhoto} resizeMode="cover" />
          )}
          <View style={styles.middleContent}>
            <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2} ellipsizeMode="tail">
              {job.title}
            </Text>
            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                <Text style={[styles.pillText, { color: theme.text.secondary }]}>{job.specialty}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: 'rgba(55,138,221,0.12)' }]}>
                <Text style={[styles.pillText, { color: '#60B4FF' }]}>{typeLabel}</Text>
              </View>
            </View>
            {hasPortfolio && (
              <View style={styles.portfolioRow}>
                {job.portfolioPhotoUrls?.slice(0, 3).map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} />
                ))}
                {portfolioCount > 3 && (
                  <View style={[styles.portfolioThumb, styles.moreThumb, { backgroundColor: theme.bg.input }]}>
                    <Text style={[styles.moreThumbText, { color: theme.text.secondary }]}>+{portfolioCount - 3}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Pay + meta row ── */}
        <View style={styles.payRow}>
          <View style={styles.payLeft}>
            <Text style={[styles.payText, { color: theme.brand.primary }]} numberOfLines={1}>
              {job.payStructure}
            </Text>
            {job.appliedToday != null && (
              <Text style={[styles.metaSmall, { color: theme.text.secondary }]}>
                🔥 {job.appliedToday} applied today
              </Text>
            )}
          </View>
          <View style={styles.payRight}>
            {job.replyTime && (
              <Text style={[styles.metaSmall, { color: theme.text.secondary }]}>
                ⚡ Replies in {job.replyTime}
              </Text>
            )}
            <Text style={[styles.metaSmall, { color: expiryColor }]}>{expiryStr}</Text>
          </View>
        </View>

        {/* ── CTAs ── */}
        {(onApply ?? onMessage) && (
          <View style={styles.ctaRow}>
            {onApply && !expired && (
              <Pressable
                onPress={onApply}
                style={[styles.applyBtn, { backgroundColor: theme.brand.primary }]}
              >
                <Text style={[styles.applyBtnText, { color: theme.text.inverse }]}>Apply Now</Text>
              </Pressable>
            )}
            {onMessage && (
              <Pressable
                onPress={onMessage}
                style={[styles.messageBtn, { borderColor: theme.brand.primary }]}
              >
                <Text style={[styles.messageBtnText, { color: theme.brand.primary }]}>
                  💬 Message
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

export function JobPostCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card }]}>
      <View style={styles.topRow}>
        <Skeleton width={56} height={56} radius={28} />
        <View style={[styles.topInfo, { gap: 8 }]}>
          <Skeleton width={140} height={16} radius={8} />
          <Skeleton width={100} height={12} radius={6} />
        </View>
        <Skeleton width={60} height={22} radius={11} />
      </View>
      <View style={styles.middleRow}>
        <Skeleton width={160} height={120} radius={8} />
        <View style={[styles.middleContent, { gap: 8 }]}>
          <Skeleton width="100%" height={22} radius={6} />
          <View style={styles.pillsRow}>
            <Skeleton width={80} height={24} radius={12} />
            <Skeleton width={70} height={24} radius={12} />
          </View>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Skeleton width={120} height={14} radius={7} />
        <Skeleton width={180} height={12} radius={6} />
      </View>
      <Skeleton width="100%" height={44} radius={22} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  topInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 13,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  middleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  salonPhoto: {
    width: 160,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
  },
  middleContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  portfolioRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  portfolioThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EDE8',
  },
  moreThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumbText: {
    fontSize: 11,
    fontWeight: '600',
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payLeft: {
    gap: 4,
  },
  payRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  payText: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaSmall: {
    fontSize: 12,
  },
  ctaRow: {
    gap: 8,
  },
  applyBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  messageBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  messageBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
