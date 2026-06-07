import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image, TouchableOpacity } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
import Svg, { Path } from 'react-native-svg'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

// ── Availability config ──
const AVAIL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NOW:           { label: 'Available',  color: '#1D9E75', bg: 'rgba(29,158,117,0.10)' },
  TODAY:         { label: 'Today',      color: '#378ADD', bg: 'rgba(55,138,221,0.10)' },
  WEEKEND:       { label: 'Weekend',    color: '#EF9F27', bg: 'rgba(239,159,39,0.10)' },
  NOT_AVAILABLE: { label: 'Busy',       color: '#E24B4A', bg: 'rgba(226,75,74,0.10)' },
}

// ── Badge config ──
const BADGE_CONFIG: Record<string, { bg: string; color: string }> = {
  'Top Rated':   { bg: '#FFF3E8', color: '#D85A30' },
  'Rising Star': { bg: '#EEF3FF', color: '#378ADD' },
  'Expert':      { bg: '#F0FFF4', color: '#1D9E75' },
  'New':         { bg: '#F5F5F5', color: '#888888' },
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

export interface WorkerCardProps {
  worker: WorkerCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
  onMessage?: () => void
  onSave?: () => void
}

export function WorkerCard({ worker, onPress, isLoading = false, onLongPress, onMessage, onSave }: WorkerCardProps) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const [saved, setSaved] = useState(worker.isSaved ?? false)

  const animIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.98, duration: 80, useNativeDriver: true }).start()
  }, [scale])

  const animOut = useCallback(() => {
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start()
  }, [scale])

  if (isLoading) return <WorkerCardSkeleton />

  const avail = AVAIL_CONFIG[worker.availability] ?? AVAIL_CONFIG.NOW
  const badge = worker.badge ? BADGE_CONFIG[worker.badge] : null
  const specialty = worker.specialties[0] ?? 'Beauty Professional'
  const hasPortfolio = (worker.portfolioUrls?.length ?? 0) > 0
  const portfolioCount = worker.portfolioUrls?.length ?? 0
  const firstInitial = worker.name?.[0]?.toUpperCase() ?? 'W'

  const handleSave = useCallback(() => {
    setSaved((p) => !p)
    onSave?.()
  }, [onSave])

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
          shadowColor: '#000000',
        }]}
      >
        {/* ── TOP SECTION: photo (left) + info (right) ── */}
        <View style={styles.topRow}>
          {/* Large photo with availability dot + verified badge */}
          <View style={styles.photoWrap}>
            {worker.photoUrl ? (
              <Image source={{ uri: worker.photoUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: '#F0EDE8' }]}>
                <Text style={styles.photoInitial}>{firstInitial}</Text>
              </View>
            )}
            <View style={[styles.availDot, { backgroundColor: avail.color }]} />
            {worker.isVerified && (
              <View style={styles.verifiedCorner}>
                <Text style={styles.verifiedCornerText}>✓</Text>
              </View>
            )}
          </View>

          {/* Right info column */}
          <View style={styles.infoCol}>
            {/* Name row + availability pill + bookmark */}
            <View style={styles.nameRow}>
              <View style={styles.nameLine}>
                <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
                  {worker.name}
                </Text>
                {worker.isVerified && (
                  <View style={styles.verifiedInline}>
                    <Text style={styles.verifiedInlineText}>✓</Text>
                  </View>
                )}
              </View>
              <View style={styles.nameRight}>
                <View style={[styles.availPill, { backgroundColor: avail.bg }]}>
                  <Text style={[styles.availPillText, { color: avail.color }]}>{avail.label}</Text>
                </View>
                <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <BookmarkIcon
                    filled={saved}
                    color={saved ? '#D85A30' : theme.text.tertiary}
                    size={20}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Specialty + badge pill */}
            <View style={styles.specialtyRow}>
              <Text style={[styles.specialty, { color: theme.text.secondary }]} numberOfLines={1}>
                {specialty}
              </Text>
              {badge && worker.badge && (
                <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgePillText, { color: badge.color }]}>{worker.badge}</Text>
                </View>
              )}
            </View>

            {/* Rating + distance */}
            <View style={styles.ratingRow}>
              {worker.rating != null && (
                <Text style={[styles.ratingText, { color: theme.text.secondary }]}>
                  ★ {worker.rating.toFixed(1)}
                  {worker.reviewCount != null ? ` (${worker.reviewCount})` : ''}
                </Text>
              )}
              {worker.distanceMiles != null && (
                <Text style={[styles.distanceText, { color: theme.text.tertiary }]}>
                  {worker.distanceMiles.toFixed(1)} km away
                </Text>
              )}
            </View>

            {/* Specialty pills */}
            <View style={styles.pillsRow}>
              {worker.specialties.slice(0, 3).map((s, i) => (
                <View key={i} style={[styles.pill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
                  <Text style={[styles.pillText, { color: theme.text.secondary }]} numberOfLines={1}>{s}</Text>
                </View>
              ))}
              {worker.specialties.length > 3 && (
                <View style={[styles.pill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
                  <Text style={[styles.pillText, { color: theme.text.tertiary }]}>+{worker.specialties.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── PORTFOLIO THUMBNAILS ── */}
        {hasPortfolio && (
          <View style={styles.portfolioSection}>
            {worker.portfolioUrls!.slice(0, 3).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} resizeMode="cover" />
            ))}
            {portfolioCount > 3 && (
              <View style={[styles.portfolioMore, { backgroundColor: theme.bg.elevated }]}>
                <Text style={[styles.portfolioMoreText, { color: theme.text.secondary }]}>
                  +{portfolioCount - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── DIVIDER ── */}
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        {/* ── FOOTER: rate | stats | buttons ── */}
        <View style={styles.footerRow}>
          {/* Rate info */}
          <View style={styles.rateCol}>
            {worker.rateRange && (
              <Text style={[styles.rateText, { color: '#1D9E75' }]}>{worker.rateRange}</Text>
            )}
            {worker.rateNote && (
              <Text style={[styles.rateNote, { color: theme.text.tertiary }]}>{worker.rateNote}</Text>
            )}
          </View>

          {/* Stats */}
          {(worker.jobsThisMonth != null || worker.replyTimeMinutes != null) && (
            <View style={styles.statsCol}>
              {worker.jobsThisMonth != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>🔥</Text>
                  <Text style={[styles.statText, { color: theme.text.secondary }]}>
                    {worker.jobsThisMonth} jobs{'\n'}this month
                  </Text>
                </View>
              )}
              {worker.replyTimeMinutes != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⚡</Text>
                  <Text style={[styles.statText, { color: theme.text.secondary }]}>
                    Replies in{'\n'}
                    {worker.replyTimeMinutes >= 60
                      ? `${Math.floor(worker.replyTimeMinutes / 60)} hour`
                      : `${worker.replyTimeMinutes} min`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsCol}>
            <Pressable style={styles.viewBtn} onPress={onPress}>
              <Text style={styles.viewBtnText}>View Profile</Text>
            </Pressable>
            {onMessage && (
              <Pressable style={[styles.messageBtn, { borderColor: '#D85A30' }]} onPress={onMessage}>
                <Text style={[styles.messageBtnText, { color: '#D85A30' }]}>Message</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

export function WorkerCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={styles.topRow}>
        <Skeleton width={74} height={92} radius={10} />
        <View style={[styles.infoCol, { gap: 6 }]}>
          <Skeleton width={120} height={15} radius={6} />
          <Skeleton width={100} height={12} radius={5} />
          <Skeleton width={80} height={11} radius={5} />
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <Skeleton width={56} height={20} radius={10} />
            <Skeleton width={56} height={20} radius={10} />
          </View>
        </View>
      </View>
      <View style={styles.portfolioSection}>
        <Skeleton width={40} height={40} radius={20} />
        <Skeleton width={40} height={40} radius={20} />
        <Skeleton width={40} height={40} radius={20} />
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
      <View style={styles.footerRow}>
        <View style={[styles.rateCol, { gap: 4 }]}>
          <Skeleton width={100} height={13} radius={5} />
          <Skeleton width={70} height={10} radius={5} />
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
  // ── Top section ──
  topRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoWrap: {
    position: 'relative',
    width: 74,
    height: 92,
  },
  photo: {
    width: 74,
    height: 92,
    borderRadius: 10,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#D85A30',
  },
  availDot: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedCorner: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D85A30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedCornerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedInline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D85A30',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  verifiedInlineText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  nameRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  availPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  availPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookmark: {
    fontSize: 16,
  },
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specialty: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 11,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // ── Portfolio ──
  portfolioSection: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  portfolioThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EDE8',
    overflow: 'hidden' as const,
  },
  portfolioMore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  portfolioMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  rateCol: {
    flex: 1,
    gap: 2,
  },
  rateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateIcon: {
    fontSize: 12,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rateNote: {
    fontSize: 10,
  },
  statsCol: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 3,
  },
  statIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  statText: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionsCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  viewBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 86,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  messageBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 86,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
