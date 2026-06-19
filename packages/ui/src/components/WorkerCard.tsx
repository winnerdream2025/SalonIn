import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
import Svg, { Path, Circle } from 'react-native-svg'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

// ── Availability config ──────────────────────────────────────────────────────
const AVAIL_CONFIG: Record<string, { label: string; dotColor: string; pillBg: string; pillText: string }> = {
  NOW:           { label: 'Available now', dotColor: '#1D9E75', pillBg: 'rgba(29,158,117,0.10)',  pillText: '#147A5A' },
  TODAY:         { label: 'Available today', dotColor: '#378ADD', pillBg: 'rgba(55,138,221,0.10)', pillText: '#2568B0' },
  WEEKEND:       { label: 'This weekend',  dotColor: '#EF9F27', pillBg: 'rgba(239,159,39,0.10)', pillText: '#A06910' },
  NOT_AVAILABLE: { label: 'Not available', dotColor: '#9CA3AF', pillBg: 'rgba(156,163,175,0.10)',pillText: '#6B7280' },
}

// ── Badge config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<string, { bg: string; color: string }> = {
  'Top Rated':   { bg: 'rgba(216,90,48,0.11)',  color: '#C44E28' },
  'Rising Star': { bg: 'rgba(55,138,221,0.11)', color: '#2568B0' },
  'Expert':      { bg: 'rgba(29,158,117,0.11)', color: '#147A5A' },
  'New':         { bg: 'rgba(147,92,255,0.11)', color: '#7240CC' },
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function BookmarkIcon({ filled, color, size }: { filled: boolean; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  )
}

function StarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color}
      />
    </Svg>
  )
}

function MessageIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

function PinIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="12" cy="8" r="2" fill={color} />
    </Svg>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface WorkerCardProps {
  worker: WorkerCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
  onMessage?: () => void
  onSave?: () => void
}

// ── Component ────────────────────────────────────────────────────────────────
export function WorkerCard({
  worker,
  onPress,
  isLoading = false,
  onLongPress,
  onMessage,
  onSave,
}: WorkerCardProps) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const [saved, setSaved] = useState(worker.isSaved ?? false)

  const animIn  = useCallback(() => Animated.timing(scale, { toValue: 0.977, duration: 80,  useNativeDriver: true }).start(), [scale])
  const animOut = useCallback(() => Animated.timing(scale, { toValue: 1,     duration: 130, useNativeDriver: true }).start(), [scale])
  const handleSave = useCallback(() => { setSaved((p) => !p); onSave?.() }, [onSave])

  if (isLoading) return <WorkerCardSkeleton />

  const avail         = AVAIL_CONFIG[worker.availability] ?? AVAIL_CONFIG.NOW
  const badge         = worker.badge ? BADGE_CONFIG[worker.badge] : null
  const hasPortfolio  = (worker.portfolioUrls?.length ?? 0) > 0
  const portfolioUrls = worker.portfolioUrls ?? []
  const firstInitial  = (worker.name?.[0] ?? 'W').toUpperCase()

  const bioText    = worker.bio && worker.bio.trim().length > 0 ? worker.bio : null
  const rateDisplay = worker.rateRange ? worker.rateRange.replace(/^\$\s*/, '') : null
  const replyLabel = worker.replyTimeMinutes != null
    ? `Replies in ${worker.replyTimeMinutes >= 60 ? `${Math.floor(worker.replyTimeMinutes / 60)}h` : `${worker.replyTimeMinutes}min`}`
    : null

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[styles.card, {
          backgroundColor: theme.bg.card,
          borderColor: theme.border.subtle,
          shadowColor: '#1A1A1A',
        }]}
      >

        {/* ════════════════════════════════════
             PORTFOLIO HERO — flush to top of card
             card has overflow:hidden, so clips to borderRadius
            ════════════════════════════════════ */}
        {hasPortfolio && (
          <View style={styles.portfolioHero}>
            {portfolioUrls.length === 1 ? (
              /* Single image — full width */
              <View style={styles.heroSingle}>
                <Image source={{ uri: portfolioUrls[0] }} style={styles.heroImg} resizeMode="cover" />
              </View>
            ) : (
              /* 2+ images — main hero (left, ~62%) + thumbnails column (right, ~38%) */
              <View style={styles.heroSplit}>
                <View style={styles.heroMain}>
                  <Image source={{ uri: portfolioUrls[0] }} style={styles.heroImg} resizeMode="cover" />
                </View>
                <View style={styles.heroThumbCol}>
                  {portfolioUrls.slice(1, 3).map((url, i) => {
                    const isLast = i === 1 && portfolioUrls.length > 3
                    return (
                      <View key={i} style={styles.heroThumb}>
                        <Image source={{ uri: url }} style={styles.heroImg} resizeMode="cover" />
                        {isLast && (
                          <View style={styles.portfolioOverlay}>
                            <Text style={styles.portfolioMoreText}>+{portfolioUrls.length - 3}</Text>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════════════════════════════
             CARD CONTENT — padded section below hero
            ════════════════════════════════════ */}
        <View style={styles.cardContent}>

          {/* Header: avatar · name · bookmark */}
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              {worker.photoUrl ? (
                <Image source={{ uri: worker.photoUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.bg.elevated }]}>
                  <Text style={styles.avatarInitial}>{firstInitial}</Text>
                </View>
              )}
              <View style={[styles.availDot, { backgroundColor: avail.dotColor, borderColor: theme.bg.card }]} />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameLine}>
                <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
                  {worker.name}
                </Text>
                {worker.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedCheck}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.specialty, { color: theme.text.secondary }]} numberOfLines={1}>
                {worker.specialties[0] ?? 'Beauty Professional'}
              </Text>
              <View style={styles.metaRow}>
                {worker.rating != null && worker.rating > 0 && (
                  <View style={styles.ratingGroup}>
                    <StarIcon color="#EF9F27" size={11} />
                    <Text style={[styles.ratingNum, { color: theme.text.primary }]}>
                      {worker.rating.toFixed(1)}
                    </Text>
                    {worker.reviewCount != null && worker.reviewCount > 0 && (
                      <Text style={[styles.ratingCount, { color: theme.text.tertiary }]}>
                        ({worker.reviewCount})
                      </Text>
                    )}
                  </View>
                )}
                {worker.distanceMiles != null && (
                  <View style={styles.distanceGroup}>
                    <PinIcon color={theme.text.tertiary} size={11} />
                    <Text style={[styles.distanceTxt, { color: theme.text.tertiary }]}>
                      {worker.distanceMiles.toFixed(1)} mi
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={styles.bookmarkBtn}>
              <BookmarkIcon filled={saved} color={saved ? '#D85A30' : theme.text.tertiary} size={19} />
            </Pressable>
          </View>

          {/* Availability + badge + skill chips */}
          <View style={styles.chipsRow}>
            <View style={[styles.availPill, { backgroundColor: avail.pillBg }]}>
              <Text style={[styles.availPillText, { color: avail.pillText }]}>{avail.label}</Text>
            </View>
            {badge !== null && worker.badge != null && (
              <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgePillText, { color: badge.color }]}>{worker.badge}</Text>
              </View>
            )}
            {worker.specialties.slice(1, 3).map((s, i) => (
              <View key={i} style={styles.skillPill}>
                <Text style={styles.skillPillText} numberOfLines={1}>{s}</Text>
              </View>
            ))}
            {worker.specialties.length > 3 && (
              <View style={[styles.skillPill, { backgroundColor: 'rgba(29,158,117,0.05)' }]}>
                <Text style={[styles.skillPillText, { color: '#1D9E75' }]}>+{worker.specialties.length - 3}</Text>
              </View>
            )}
          </View>

          {/* Bio — 2 lines */}
          {bioText != null && bioText.length > 0 && (
            <Text style={[styles.bio, { color: theme.text.secondary }]} numberOfLines={2}>
              {bioText}
            </Text>
          )}

          {/* Footer: rate · reply · Message CTA */}
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              {rateDisplay != null ? (
                <View style={styles.rateRow}>
                  <View style={styles.moneyBadge}>
                    <Text style={styles.moneyBadgeText}>$</Text>
                  </View>
                  <Text style={[styles.rateAmount, { color: '#1D9E75' }]}>{rateDisplay}</Text>
                </View>
              ) : worker.experienceYears > 0 ? (
                <Text style={[styles.rateAmount, { color: '#1D9E75' }]}>
                  {worker.experienceYears}yr experience
                </Text>
              ) : null}
              {replyLabel != null && (
                <Text style={[styles.replyLabel, { color: theme.text.tertiary }]} numberOfLines={1}>
                  {replyLabel}
                </Text>
              )}
              {worker.jobsThisMonth != null && worker.jobsThisMonth > 0 && replyLabel == null && (
                <Text style={[styles.replyLabel, { color: theme.text.tertiary }]} numberOfLines={1}>
                  {worker.jobsThisMonth} jobs this month
                </Text>
              )}
            </View>

            {onMessage !== undefined && (
              <Pressable style={styles.messageBtn} onPress={onMessage}>
                <MessageIcon color="#FFFFFF" size={14} />
                <Text style={styles.messageBtnText}>Message</Text>
              </Pressable>
            )}
          </View>

        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function WorkerCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      {/* Hero skeleton */}
      <Skeleton width="100%" height={160} radius={0} />
      {/* Content skeleton */}
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={[styles.nameBlock, { gap: 6 }]}>
            <Skeleton width={130} height={15} radius={7} />
            <Skeleton width={95}  height={12} radius={5} />
            <Skeleton width={75}  height={11} radius={5} />
          </View>
          <Skeleton width={19} height={22} radius={4} />
        </View>
        <View style={[styles.chipsRow, { gap: 5 }]}>
          <Skeleton width={100} height={24} radius={12} />
          <Skeleton width={72}  height={24} radius={12} />
          <Skeleton width={60}  height={24} radius={12} />
        </View>
        <View style={{ gap: 5 }}>
          <Skeleton width="100%" height={12} radius={5} />
          <Skeleton width="72%"  height={12} radius={5} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
        <View style={styles.footerRow}>
          <View style={{ gap: 5 }}>
            <Skeleton width={95}  height={14} radius={6} />
            <Skeleton width={115} height={11} radius={5} />
          </View>
          <Skeleton width={100} height={36} radius={18} />
        </View>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card — no paddingHorizontal here; hero goes full-bleed, content handles its own padding
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
    overflow: 'hidden',
  },

  // ── Portfolio hero ────────────────────────────
  portfolioHero: {
    // full-bleed — no horizontal inset, card overflow:hidden clips to radius
  },
  heroSingle: {
    height: 160,
    backgroundColor: '#F0EDE8',
  },
  heroSplit: {
    flexDirection: 'row',
    height: 160,
    gap: 3,
    backgroundColor: '#E8E4DF',
  },
  heroMain: {
    flex: 5,
    backgroundColor: '#F0EDE8',
  },
  heroThumbCol: {
    flex: 3,
    gap: 3,
    flexDirection: 'column',
  },
  heroThumb: {
    flex: 1,
    backgroundColor: '#E8E4DF',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  portfolioOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioMoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Card content ──────────────────────────────
  cardContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },

  // ── Header ────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  // Circle avatar
  avatarWrap: {
    width: 52,
    height: 52,
    flexShrink: 0,
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0EDE8',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D85A30',
  },
  availDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },

  // Name block
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#378ADD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedCheck: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  specialty: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // Meta: rating + distance
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ratingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingNum: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 11,
    fontWeight: '400',
  },
  distanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceTxt: {
    fontSize: 11,
    fontWeight: '400',
  },

  // Bookmark
  bookmarkBtn: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 2,
  },

  // ── Chips row ─────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 5,
    overflow: 'hidden',
  },
  availPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  availPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  skillPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.09)',
    flexShrink: 1,
    minWidth: 0,
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#147A5A',
  },

  // ── Bio ──────────────────────────────────
  bio: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // ── Divider ───────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // ── Footer ───────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerLeft: {
    flex: 1,
    gap: 2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moneyBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -1,
  },
  rateAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#D85A30',
    flexShrink: 0,
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
})
