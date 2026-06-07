import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image, TouchableOpacity } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
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
                  <Text style={[styles.bookmark, { color: saved ? '#D85A30' : theme.text.tertiary }]}>
                    {saved ? '🔖' : '🏷'}
                  </Text>
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
                  📍 {worker.distanceMiles.toFixed(1)} km away
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
            {worker.portfolioUrls!.slice(0, 4).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} resizeMode="cover" />
            ))}
            {portfolioCount > 4 && (
              <View style={[styles.portfolioMore, { backgroundColor: theme.bg.elevated }]}>
                <Text style={[styles.portfolioMoreText, { color: theme.text.secondary }]}>
                  +{portfolioCount - 4}
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
              <View style={styles.rateWrap}>
                <Text style={styles.rateIcon}>💲</Text>
                <Text style={[styles.rateText, { color: '#1D9E75' }]}>{worker.rateRange}</Text>
              </View>
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
                <Text style={[styles.messageBtnText, { color: '#D85A30' }]}>💬 Message</Text>
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
        <Skeleton width={120} height={160} radius={12} />
        <View style={[styles.infoCol, { gap: 8 }]}>
          <Skeleton width={140} height={18} radius={8} />
          <Skeleton width={120} height={14} radius={6} />
          <Skeleton width={100} height={14} radius={6} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Skeleton width={70} height={24} radius={12} />
            <Skeleton width={70} height={24} radius={12} />
          </View>
        </View>
      </View>
      <View style={styles.portfolioSection}>
        <Skeleton width={68} height={68} radius={10} />
        <Skeleton width={68} height={68} radius={10} />
        <Skeleton width={68} height={68} radius={10} />
        <Skeleton width={68} height={68} radius={10} />
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
      <View style={styles.footerRow}>
        <View style={[styles.rateCol, { gap: 6 }]}>
          <Skeleton width={120} height={16} radius={6} />
          <Skeleton width={80} height={12} radius={6} />
        </View>
        <View style={[styles.actionsCol, { gap: 6 }]}>
          <Skeleton width={110} height={36} radius={22} />
          <Skeleton width={110} height={32} radius={22} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // ── Top section ──
  topRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoWrap: {
    position: 'relative',
    width: 120,
    height: 160,
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: '#D85A30',
  },
  availDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  verifiedCorner: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D85A30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  verifiedCornerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedInline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D85A30',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  verifiedInlineText: {
    fontSize: 9,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookmark: {
    fontSize: 20,
  },
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specialty: {
    fontSize: 14,
    fontWeight: '500',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // ── Portfolio ──
  portfolioSection: {
    flexDirection: 'row',
    gap: 6,
  },
  portfolioThumb: {
    flex: 1,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  portfolioMore: {
    width: 52,
    height: 68,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioMoreText: {
    fontSize: 15,
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
    gap: 8,
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
    fontSize: 14,
  },
  rateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  rateNote: {
    fontSize: 11,
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
    gap: 6,
    alignItems: 'flex-end',
  },
  viewBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    minWidth: 110,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  messageBtn: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 110,
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
