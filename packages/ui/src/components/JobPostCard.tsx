import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { JobPostCardData } from '@salonin/types'
import { isJobExpired } from '@salonin/utils'
import Svg, { Path, Rect } from 'react-native-svg'
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

const TYPE_PILL_COLOR: Record<string, { bg: string; text: string }> = {
  FULL_TIME:  { bg: 'rgba(29,158,117,0.1)',  text: '#1D9E75' },
  PART_TIME:  { bg: 'rgba(147,92,255,0.1)',  text: '#935CFF' },
  TEMPORARY:  { bg: 'rgba(55,138,221,0.1)',  text: '#378ADD' },
  WEEKEND:    { bg: 'rgba(239,159,39,0.1)',   text: '#EF9F27' },
  EMERGENCY:  { bg: 'rgba(226,75,74,0.1)',    text: '#E24B4A' },
}

function MoneyIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size + 4} height={size} viewBox="0 0 22 16" fill="none">
      <Rect x="1" y="1" width="20" height="14" rx="3" stroke={color} strokeWidth="1.6" />
      <Path
        d="M11 4v8M9.5 6.5A1.5 1.5 0 0111 5a1.5 1.5 0 011.5 1.5A1.5 1.5 0 0111 8a1.5 1.5 0 00-1.5 1.5A1.5 1.5 0 0011 11a1.5 1.5 0 001.5-1.5"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  )
}

function ChatIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function BookmarkIcon({ filled, color, size }: { filled: boolean; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  )
}

type BadgeKind = 'urgent' | 'hot' | 'new'

function daysUntil(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
}

const CITY_DISPLAY: Record<string, string> = {
  dmv:     'DMV (DC/MD/VA)',
  atlanta: 'Atlanta',
  houston: 'Houston',
  miami:   'Miami',
}

function formatCity(cityId: string | undefined | null): string {
  if (!cityId) return ''
  if (CITY_DISPLAY[cityId]) return CITY_DISPLAY[cityId]
  const parts = cityId.split(/[_\-]+/)
  const last = parts[parts.length - 1]
  if (last.length === 2 && parts.length > 1) {
    const city = parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return `${city}, ${last.toUpperCase()}`
  }
  return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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
            size="lg"
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
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={[styles.metaText, { color: theme.text.secondary }]} numberOfLines={1}>
                {formatCity(job.cityId)}
                {job.salonRating != null && (
                  <Text style={{ color: theme.text.secondary }}>{`  •  ${job.salonRating.toFixed(1)} ⭐`}</Text>
                )}
                {job.salonReviewCount != null && (
                  <Text style={{ color: theme.text.tertiary }}>{` (${job.salonReviewCount})`}</Text>
                )}
              </Text>
            </View>
            {job.salonHiringCount != null && job.salonHiringCount > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={[styles.metaText, { color: '#D85A30' }]} numberOfLines={1}>
                  {job.salonHiringCount} hiring this month
                </Text>
              </View>
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
              <BookmarkIcon
                filled={savedLocal}
                color={savedLocal ? theme.brand.primary : theme.text.tertiary}
                size={22}
              />
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
              <View style={[styles.pill, { backgroundColor: (TYPE_PILL_COLOR[job.type] ?? TYPE_PILL_COLOR.FULL_TIME).bg }]}>
                <Text style={[styles.pillText, { color: (TYPE_PILL_COLOR[job.type] ?? TYPE_PILL_COLOR.FULL_TIME).text }]}>{typeLabel}</Text>
              </View>
            </View>

            {hasPortfolio && (
              <View style={styles.portfolioRow}>
                {job.portfolioPhotoUrls!.slice(0, 3).map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={[styles.portfolioThumb, { backgroundColor: theme.bg.input }]} resizeMode="cover" />
                ))}
                {portfolioCount > 3 && (
                  <View style={[styles.moreCountBubble, { backgroundColor: theme.bg.input }]}>
                    <Text style={[styles.moreCountText, { color: theme.text.secondary }]}>
                      +{portfolioCount - 3}
                    </Text>
                  </View>
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
            <View style={styles.payIconRow}>
              <MoneyIcon color="#1D9E75" size={16} />
              <Text style={[styles.payText, { color: '#1D9E75' }]} numberOfLines={1}>
                {job.payStructure}
              </Text>
            </View>
            {job.estimatedWeekly && (
              <Text style={[styles.payEstimate, { color: theme.text.tertiary }]} numberOfLines={1}>
                Est. {job.estimatedWeekly}
              </Text>
            )}
          </View>

          <View style={styles.engagementCol}>
            <Text style={[styles.engagementText, { color: theme.text.secondary }]}>
              🔥 {job.appliedToday ?? 5} applied today
            </Text>
            <Text style={[styles.engagementText, { color: theme.text.secondary }]}>
              ⚡ Replies in {job.replyTime ?? '2 hours'}
            </Text>
          </View>

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
                <ChatIcon color={theme.brand.primary} size={13} />
                <Text style={[styles.messageBtnText, { color: theme.brand.primary }]}>
                  Message
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
        <Skeleton width={110} height={100} radius={10} />
        <View style={[styles.bodyRight, { gap: 6 }]}>
          <Skeleton width="100%" height={18} radius={5} />
          <View style={styles.pillsRow}>
            <Skeleton width={60} height={18} radius={10} />
            <Skeleton width={56} height={18} radius={10} />
          </View>
          <View style={styles.portfolioRow}>
            <Skeleton width={44} height={44} radius={8} />
            <Skeleton width={44} height={44} radius={8} />
            <Skeleton width={44} height={44} radius={8} />
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
          <Skeleton width={86} height={28} radius={16} />
          <Skeleton width={86} height={24} radius={16} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    gap: 6,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  verifiedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#378ADD',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  verifiedCheckmark: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 1,
  },
  metaIcon: {
    fontSize: 11,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
  headerRight: {
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
  badgeUrgent: { backgroundColor: 'rgba(216,90,48,0.12)' },
  badgeHot: { backgroundColor: 'rgba(239,159,39,0.12)' },
  badgeNew: { backgroundColor: 'rgba(29,158,117,0.12)' },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
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
    width: 120,
    height: 108,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitial: {
    fontSize: 34,
    fontWeight: '800',
  },
  bodyRight: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillCoral: {
    backgroundColor: 'rgba(216,90,48,0.10)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillCoralText: {
    color: '#D85A30',
  },
  portfolioRow: {
    flexDirection: 'row' as const,
    gap: 4,
    marginTop: 4,
    alignItems: 'center' as const,
  },
  portfolioThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  moreCountBubble: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  moreCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  payCol: {
    flex: 1,
    gap: 2,
  },
  payIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  payText: {
    fontSize: 13,
    fontWeight: '700',
  },
  payEstimate: {
    fontSize: 11,
    fontWeight: '400',
  },
  actionsCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  applyBtn: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 86,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
    minWidth: 86,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // ── Engagement (middle column) ──
  engagementCol: {
    flex: 1,
    gap: 3,
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center' as const,
    lineHeight: 14,
  },
})
