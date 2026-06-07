import React, { useRef, useCallback, useState } from 'react'
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

type BadgeKind = 'urgent' | 'hot' | 'new'

function daysUntil(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
}

function pickBadge(job: JobPostCardData, expired: boolean): { label: string; kind: BadgeKind } | null {
  if (expired) return null
  if (job.isUrgent) return { label: '⚡ Urgent', kind: 'urgent' }
  if ((job.appliedToday ?? 0) > 5) return { label: '🔥 Hot', kind: 'hot' }
  // "New" heuristic: expiresAt is far in the future (just posted, e.g. > 25 days remain on a 30-day post)
  if (daysUntil(job.expiresAt) >= 25) return { label: '✨ New', kind: 'new' }
  return null
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
  const [savedLocal, setSavedLocal] = useState<boolean>(isSaved)

  const animIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()
  }, [scale])

  const animOut = useCallback(() => {
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }, [scale])

  const handleSave = useCallback(() => {
    setSavedLocal((s) => !s)
    onSave?.()
  }, [onSave])

  if (isLoading) return <JobPostCardSkeleton />

  const expired = isJobExpired(job.expiresAt)
  const typeLabel = TYPE_LABEL[job.type] ?? job.type
  const badge = pickBadge(job, expired)
  const coverUri = job.salonCoverUrl ?? job.salonPhotoUrl ?? null

  const hasPortfolio = (job.portfolioPhotoUrls?.length ?? 0) > 0
  const portfolioCount = job.portfolioPhotoUrls?.length ?? 0

  const badgeStyle = badge
    ? badge.kind === 'urgent'
      ? styles.badgeUrgent
      : badge.kind === 'hot'
        ? styles.badgeHot
        : styles.badgeNew
    : null
  const badgeTextColor = badge
    ? badge.kind === 'urgent'
      ? '#D85A30'
      : badge.kind === 'hot'
        ? '#EF9F27'
        : '#1D9E75'
    : '#000'

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[styles.card, {
          backgroundColor: theme.bg.card,
          borderColor: theme.border.subtle,
          shadowColor: '#000000',
        }]}
      >
        {/* ── HEADER: salon logo + name/verified + meta + badge + bookmark ── */}
        <View style={styles.headerRow}>
          <Avatar
            uri={job.salonPhotoUrl}
            name={job.salonName}
            size="md"
          />
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.salonName, { color: theme.text.primary }]} numberOfLines={1}>
                {job.salonName}
              </Text>
              {job.salonVerified && (
                <View style={styles.verifiedCircle}>
                  <Text style={styles.verifiedCheckmark}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.metaText, { color: theme.text.tertiary }]} numberOfLines={1}>
              📍 {job.cityId.toUpperCase()}
              {job.salonRating != null && (
                <Text>{`  •  ★ ${job.salonRating.toFixed(1)}${job.salonReviewCount != null ? ` (${job.salonReviewCount})` : ''}`}</Text>
              )}
            </Text>
            {job.salonHiringCount != null && job.salonHiringCount > 0 && (
              <Text style={[styles.metaText, { color: theme.text.tertiary }]} numberOfLines={1}>
                👥 {job.salonHiringCount} hiring this month
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {badge && (
              <View style={[styles.badge, badgeStyle]}>
                <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badge.label}</Text>
              </View>
            )}
            <Pressable
              onPress={handleSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.bookmarkBtn}
            >
              <Text style={{ fontSize: 18, color: savedLocal ? theme.brand.primary : theme.text.tertiary }}>
                {savedLocal ? '🔖' : '🏷'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── BODY: cover photo (left) + title/pills/portfolio (right) ── */}
        <View style={styles.bodyRow}>
          <View style={styles.coverWrap}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <View style={[styles.coverImg, styles.coverPlaceholder, { backgroundColor: theme.bg.input }]}>
                <Text style={[styles.coverInitial, { color: theme.brand.primary }]}>
                  {job.salonName?.[0]?.toUpperCase() ?? 'S'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bodyRight}>
            <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2} ellipsizeMode="tail">
              {job.title}
            </Text>

            <View style={styles.pillsRow}>
              {job.specialty.split(/[,/]/).map((tag, i) => (
                <View key={`s-${i}`} style={[styles.pill, styles.pillCoral]}>
                  <Text style={[styles.pillText, styles.pillCoralText]}>{tag.trim()}</Text>
                </View>
              ))}
              <View style={[styles.pill, styles.pillCoral]}>
                <Text style={[styles.pillText, styles.pillCoralText]}>{typeLabel}</Text>
              </View>
            </View>

            {hasPortfolio && (
              <View style={styles.portfolioRow}>
                {job.portfolioPhotoUrls!.slice(0, 4).map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} />
                ))}
                {portfolioCount > 4 && (
                  <Text style={[styles.moreCountText, { color: theme.text.secondary }]}>
                    +{portfolioCount - 4}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── DIVIDER ── */}
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        {/* ── FOOTER: 3-column — pay | engagement | actions ── */}
        <View style={styles.footerRow}>
          <View style={styles.payCol}>
            <Text style={[styles.payText, { color: '#1D9E75' }]} numberOfLines={1}>
              💲 {job.payStructure}
            </Text>
            {job.estimatedWeekly && (
              <Text style={[styles.payEstimate, { color: theme.text.tertiary }]} numberOfLines={1}>
                Est. {job.estimatedWeekly}
              </Text>
            )}
          </View>

          {(job.appliedToday != null || job.replyTime) && (
            <View style={styles.engagementCol}>
              {job.appliedToday != null && (
                <Text style={[styles.engagementText, { color: theme.text.tertiary }]} numberOfLines={1}>
                  🔥 {job.appliedToday} applied{' '}today
                </Text>
              )}
              {job.replyTime && (
                <Text style={[styles.engagementText, { color: theme.text.tertiary }]} numberOfLines={1}>
                  ⚡ Replies in{' '}{job.replyTime}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionsCol}>
            {onApply && !expired && (
              <Pressable
                onPress={onApply}
                style={[styles.applyBtn, { backgroundColor: theme.brand.primary }]}
              >
                <Text style={[styles.applyBtnText, { color: '#FFFFFF' }]}>Apply Now</Text>
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
        </View>
      </Pressable>
    </Animated.View>
  )
}

export function JobPostCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={styles.headerRow}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={[styles.headerInfo, { gap: 4 }]}>
          <Skeleton width={120} height={14} radius={6} />
          <Skeleton width={100} height={11} radius={5} />
        </View>
        <Skeleton width={50} height={18} radius={9} />
      </View>
      <View style={styles.bodyRow}>
        <Skeleton width={90} height={84} radius={8} />
        <View style={[styles.bodyRight, { gap: 6 }]}>
          <Skeleton width="100%" height={18} radius={5} />
          <View style={styles.pillsRow}>
            <Skeleton width={60} height={18} radius={10} />
            <Skeleton width={56} height={18} radius={10} />
          </View>
          <View style={styles.portfolioRow}>
            <Skeleton width={28} height={28} radius={8} />
            <Skeleton width={28} height={28} radius={8} />
            <Skeleton width={28} height={28} radius={8} />
          </View>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
      <View style={styles.footerRow}>
        <View style={[styles.payCol, { gap: 4 }]}>
          <Skeleton width={100} height={13} radius={5} />
          <Skeleton width={80} height={10} radius={5} />
        </View>
        <View style={[styles.actionsCol, { gap: 4 }]}>
          <Skeleton width={90} height={30} radius={15} />
          <Skeleton width={90} height={28} radius={14} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salonName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  verifiedCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D85A30',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  verifiedCheckmark: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  metaText: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeUrgent: { backgroundColor: 'rgba(216,90,48,0.12)' },
  badgeHot: { backgroundColor: 'rgba(239,159,39,0.15)' },
  badgeNew: { backgroundColor: 'rgba(29,158,117,0.12)' },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookmarkBtn: {
    padding: 2,
  },
  // ── Body ──
  bodyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coverWrap: {},
  coverImg: {
    width: 90,
    height: 84,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  bodyRight: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillCoral: {
    backgroundColor: 'rgba(216,90,48,0.10)',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pillCoralText: {
    color: '#D85A30',
  },
  portfolioRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 1,
  },
  portfolioThumb: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
  },
  moreCountText: {
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'center' as const,
    marginLeft: 2,
  },
  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payCol: {
    flex: 1,
    gap: 2,
  },
  payText: {
    fontSize: 13,
    fontWeight: '700',
  },
  payEstimate: {
    fontSize: 10,
  },
  actionsCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  applyBtn: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageBtn: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minWidth: 90,
  },
  messageBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Engagement (middle column) ──
  engagementCol: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 10,
    fontWeight: '500',
  },
})
