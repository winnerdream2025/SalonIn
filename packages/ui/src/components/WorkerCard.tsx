import React, { useRef, useCallback, useState, memo } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
import Svg, { Path, Circle } from 'react-native-svg'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

// ── Availability ──────────────────────────────────────────────────────────────
const AVAIL_CONFIG: Record<string, { label: string; dotColor: string }> = {
  NOW:           { label: 'Available now',   dotColor: '#1D9E75' },
  TODAY:         { label: 'Available today', dotColor: '#378ADD' },
  WEEKEND:       { label: 'This weekend',    dotColor: '#EF9F27' },
  NOT_AVAILABLE: { label: 'Not available',   dotColor: '#9CA3AF' },
}

const BADGE_COLOR: Record<string, string> = {
  'Top Rated':   '#C44E28',
  'Rising Star': '#2568B0',
  'Expert':      '#147A5A',
  'New':         '#7240CC',
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function BookmarkIcon({ filled, color, size }: { filled: boolean; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} />
    </Svg>
  )
}

function StarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color} />
    </Svg>
  )
}

function PlayIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)" />
      <Path d="M10 8.5l6 3.5-6 3.5v-7z" fill="#FFFFFF" />
    </Svg>
  )
}

function PinIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="8" r="2" fill={color} />
    </Svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface WorkerCardProps {
  worker: WorkerCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
  onMessage?: () => void
  onSave?: () => void
  /** Story ring state for this worker's avatar */
  storyState?: 'unseen' | 'seen' | 'none'
  onStoryPress?: () => void
}

const STRIP_VISIBLE = 3   // photos shown as squares
const THUMB_SIZE    = 64  // px — each square

// ── Component ─────────────────────────────────────────────────────────────────
function WorkerCardImpl({
  worker,
  onPress,
  isLoading = false,
  onLongPress,
  onMessage,
  onSave,
  storyState = 'none',
  onStoryPress,
}: WorkerCardProps) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const [saved, setSaved] = useState(worker.isSaved ?? false)

  const animIn  = useCallback(() => Animated.timing(scale, { toValue: 0.977, duration: 80,  useNativeDriver: true }).start(), [scale])
  const animOut = useCallback(() => Animated.timing(scale, { toValue: 1,     duration: 130, useNativeDriver: true }).start(), [scale])
  const handleSave = useCallback(() => { setSaved((p) => !p); onSave?.() }, [onSave])

  if (isLoading) return <WorkerCardSkeleton />

  const avail         = AVAIL_CONFIG[worker.availability] ?? AVAIL_CONFIG.NOW
  const badgeColor    = worker.badge ? BADGE_COLOR[worker.badge] : null
  // Prefer the combined media list (images + videos); fall back to legacy urls.
  const portfolioMedia = worker.portfolioMedia
    ?? (worker.portfolioUrls ?? []).map((url) => ({ url, isVideo: false }))
  const firstInitial  = (worker.name?.[0] ?? 'W').toUpperCase()
  const rateDisplay   = worker.rateRange ?? null
  const specialtyLine = worker.specialties.join(' · ')

  // Strip: first STRIP_VISIBLE items shown; remainder as +N
  const stripItems  = portfolioMedia.slice(0, STRIP_VISIBLE)
  const extraCount  = portfolioMedia.length - STRIP_VISIBLE
  const hasStrip    = portfolioMedia.length > 0

  const replyLabel = worker.replyTimeMinutes != null
    ? `Replies in ${worker.replyTimeMinutes >= 60 ? `${Math.floor(worker.replyTimeMinutes / 60)}h` : `${worker.replyTimeMinutes}min`}`
    : worker.jobsThisMonth != null && worker.jobsThisMonth > 0
      ? `${worker.jobsThisMonth} jobs this month`
      : null

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.card, {
        backgroundColor: theme.bg.card,
        borderColor: theme.border.subtle,
        shadowColor: '#1A1A1A',
      }]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={animIn}
          onPressOut={animOut}
        >
        <View style={styles.cardBody}>

          {/* ── HEADER: avatar · identity · bookmark ──────────────────────── */}
          <View style={styles.headerRow}>

            <View style={styles.avatarWrap}>
              <Pressable
                onPress={storyState !== 'none' ? onStoryPress : undefined}
                style={storyState !== 'none' ? [
                  styles.storyRing,
                  { borderColor: storyState === 'unseen' ? '#D85A30' : '#666' },
                ] : undefined}
              >
                {worker.photoUrl ? (
                  <Image source={{ uri: worker.photoUrl }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.bg.elevated }]}>
                    <Text style={styles.avatarInitial}>{firstInitial}</Text>
                  </View>
                )}
              </Pressable>
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
                {worker.badge != null && badgeColor != null && (
                  <Text style={[styles.badgeInline, { color: badgeColor }]} numberOfLines={1}>
                    {worker.badge}
                  </Text>
                )}
              </View>

              <Text style={[styles.primarySpecialty, { color: theme.text.secondary }]} numberOfLines={1}>
                {worker.specialties[0] ?? 'Beauty Professional'}
              </Text>

              {/* Rating · distance · availability — one tight line */}
              <View style={styles.metaRow}>
                {worker.rating != null && worker.rating > 0 && (
                  <>
                    <StarIcon color="#EF9F27" size={10} />
                    <Text style={[styles.metaText, { color: theme.text.primary, fontWeight: '600' }]}>
                      {worker.rating.toFixed(1)}
                    </Text>
                    {worker.reviewCount != null && worker.reviewCount > 0 && (
                      <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                        ({worker.reviewCount})
                      </Text>
                    )}
                    <Text style={[styles.metaDot, { color: theme.text.tertiary }]}>·</Text>
                  </>
                )}
                {worker.distanceMiles != null && (
                  <>
                    <PinIcon color={theme.text.tertiary} size={10} />
                    <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                      {worker.distanceMiles.toFixed(1)} mi
                    </Text>
                    <Text style={[styles.metaDot, { color: theme.text.tertiary }]}>·</Text>
                  </>
                )}
                <View style={[styles.availInlineDot, { backgroundColor: avail.dotColor }]} />
                <Text
                  style={[styles.metaText, styles.metaAvail, { color: avail.dotColor, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {avail.label}
                </Text>
              </View>
            </View>

            <Pressable onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={styles.bookmarkBtn}>
              <BookmarkIcon filled={saved} color={saved ? '#D85A30' : theme.text.tertiary} size={18} />
            </Pressable>
          </View>

          {/* ── SPECIALTIES — dot-separated plain text ─────────────────────── */}
          {worker.specialties.length > 0 && (
            <Text style={[styles.specialtiesText, { color: theme.text.secondary }]} numberOfLines={1}>
              {specialtyLine}
            </Text>
          )}

          {/* ── MOBILITY TAGS — key differentiator vs Booksy/StyleSeat ──────── */}
          {(worker.travelServiceEnabled || worker.homeServiceEnabled) && (
            <View style={styles.mobilityRow}>
              {worker.travelServiceEnabled && (
                <View style={styles.mobilityTagTravel}>
                  <Text style={styles.mobilityTagText}>🚗 Comes to you</Text>
                </View>
              )}
              {worker.homeServiceEnabled && (
                <View style={styles.mobilityTagHome}>
                  <Text style={styles.mobilityTagText}>🏠 Home studio</Text>
                </View>
              )}
            </View>
          )}

          {/* ── WORK PHOTO STRIP ──────────────────────────────────────────── */}
          {hasStrip && (
            <View style={styles.photoStrip}>
              {stripItems.map((item, i) => (
                <View key={i} style={styles.stripThumb}>
                  {item.isVideo ? (
                    <>
                      <View style={[StyleSheet.absoluteFillObject, styles.videoFill]} />
                      <View style={styles.playBadge}>
                        <PlayIcon size={22} />
                      </View>
                    </>
                  ) : (
                    <Image source={{ uri: item.url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  )}
                </View>
              ))}
              {/* +N chip for remaining photos */}
              {extraCount > 0 && (
                <View style={[styles.stripMore, { backgroundColor: theme.bg.elevated }]}>
                  <Text style={[styles.stripMoreText, { color: theme.text.secondary }]}>
                    +{extraCount}
                  </Text>
                </View>
              )}
            </View>
          )}

        </View>
        </Pressable>

        {/* ── FOOTER: outside card Pressable — message button is standalone ── */}
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
        <View style={[styles.footerRow, styles.footerPad]}>
          <View style={styles.footerLeft}>
            {rateDisplay != null ? (
              <Text style={[styles.rateText, { color: '#1D9E75' }]} numberOfLines={1}>
                {rateDisplay}
              </Text>
            ) : worker.experienceYears > 0 ? (
              <Text style={[styles.rateText, { color: '#1D9E75' }]} numberOfLines={1}>
                {worker.experienceYears} yrs exp.
              </Text>
            ) : null}
            {replyLabel != null && (
              <Text style={[styles.replyLabel, { color: theme.text.tertiary }]} numberOfLines={1}>
                {replyLabel}
              </Text>
            )}
          </View>

          {onMessage !== undefined && (
            <Pressable style={[styles.messageBtn, { borderColor: '#D85A30' }]} onPress={onMessage}>
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>
          )}
        </View>

      </View>
    </Animated.View>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function WorkerCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={[styles.nameBlock, { gap: 5 }]}>
            <Skeleton width={120} height={14} radius={6} />
            <Skeleton width={80}  height={11} radius={5} />
            <Skeleton width={140} height={10} radius={5} />
          </View>
          <Skeleton width={18} height={20} radius={4} />
        </View>
        <Skeleton width="70%" height={11} radius={5} />
        {/* Strip skeleton */}
        <View style={styles.photoStrip}>
          <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} radius={10} />
          <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} radius={10} />
          <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} radius={10} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
        <View style={styles.footerRow}>
          <View style={{ gap: 4 }}>
            <Skeleton width={85}  height={13} radius={6} />
            <Skeleton width={100} height={10} radius={5} />
          </View>
          <Skeleton width={84} height={30} radius={15} />
        </View>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },

  cardContent: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 11,
    gap: 8,
  },

  cardBody: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },

  footerPad: {
    paddingHorizontal: 13,
    paddingBottom: 11,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    flexShrink: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    borderWidth: 2.5,
    borderRadius: 26,
    padding: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EDE8',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D85A30',
  },
  availDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
  badgeInline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  primarySpecialty: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '400',
    flexShrink: 0,   // numeric values (rating, distance) never truncate
  },
  metaAvail: {
    flexShrink: 1,   // availability label ("Available now") can truncate last
    minWidth: 0,
  },
  metaDot: {
    fontSize: 11,
    marginHorizontal: 1,
    flexShrink: 0,
  },
  availInlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  bookmarkBtn: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },

  // ── Specialties text ──────────────────────────────────────────────────────
  specialtiesText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // ── Mobility tags ─────────────────────────────────────────────────────────
  mobilityRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  mobilityTagTravel: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(21,101,192,0.10)',
  },
  mobilityTagHome: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(29,158,117,0.10)',
  },
  mobilityTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },

  // ── Work photo strip ──────────────────────────────────────────────────────
  photoStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  stripThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
  },
  videoFill: {
    backgroundColor: '#2A2A2A',
  },
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripMore: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripMoreText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
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
  rateText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '400',
  },
  messageBtn: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 15,
    paddingVertical: 7,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    color: '#D85A30',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
})

export const WorkerCard = memo(WorkerCardImpl)
