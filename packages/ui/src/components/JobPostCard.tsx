import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { JobPostCardData } from '@salonin/types'
import { isJobExpired } from '@salonin/utils'
import { getCityLabel } from '@salonin/config'
import Svg, { Path } from 'react-native-svg'
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

// ── Employment type ───────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  FULL_TIME:      { label: 'Full-time',      color: '#147A5A', bg: 'rgba(29,158,117,0.13)'  },
  PART_TIME:      { label: 'Part-time',      color: '#6930B8', bg: 'rgba(147,92,255,0.13)'  },
  TEMPORARY:      { label: 'Temporary',      color: '#1F5FA6', bg: 'rgba(55,138,221,0.13)'  },
  WEEKEND:        { label: 'Weekend',        color: '#A05C00', bg: 'rgba(239,159,39,0.13)'  },
  EMERGENCY:      { label: 'Urgent',         color: '#B52A2A', bg: 'rgba(226,75,74,0.13)'   },
  CONTRACT:       { label: 'Contract',       color: '#3D4A5C', bg: 'rgba(107,114,128,0.13)' },
  SEASONAL:       { label: 'Seasonal',       color: '#A03A06', bg: 'rgba(234,88,12,0.13)'   },
  APPRENTICESHIP: { label: 'Apprenticeship', color: '#5A28A0', bg: 'rgba(139,92,246,0.13)'  },
  FREELANCE:      { label: 'Freelance',      color: '#0A7A9A', bg: 'rgba(6,182,212,0.13)'   },
}

// ── Listing type ──────────────────────────────────────────────────────────────
const LISTING_META: Record<string, { buttonLabel: string }> = {
  JOB:    { buttonLabel: 'Apply Now' },
  RENTAL: { buttonLabel: 'Inquire'   },
  SPACE:  { buttonLabel: 'Book'      },
}

// ── Status badge — shown as a photo sticker ───────────────────────────────────
type BadgeIcon = 'flash' | 'fire' | 'sparkle'
interface StatusBadge {
  label: string
  solidBg: string   // semi-opaque for photo overlay
  icon: BadgeIcon
}

function deriveStatusBadge(job: JobPostCardData): StatusBadge | null {
  if (job.isUrgent || job.type === 'EMERGENCY') {
    return { label: 'Urgent', solidBg: 'rgba(196,78,40,0.88)', icon: 'flash' }
  }
  if ((job.appliedToday ?? 0) >= 3) {
    return { label: 'Hot', solidBg: 'rgba(181,117,12,0.88)', icon: 'fire' }
  }
  if ((job.applicantCount ?? 0) === 0 && (job.appliedToday ?? 0) === 0) {
    return { label: 'New', solidBg: 'rgba(109,51,204,0.88)', icon: 'sparkle' }
  }
  return null
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
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

function PinIcon({ color = '#9CA3AF', size = 10 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 10 13" fill="none">
      <Path
        d="M5 0C2.79 0 1 1.79 1 4c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4zm0 5.5C4.17 5.5 3.5 4.83 3.5 4S4.17 2.5 5 2.5 6.5 3.17 6.5 4 5.83 5.5 5 5.5z"
        fill={color}
      />
    </Svg>
  )
}

function FlashIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.25}
      />
    </Svg>
  )
}

function FireIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c3.31 0 6-2.69 6-6 0-1.82-.86-3.45-2.2-4.5.12.48.2.98.2 1.5 0 2.21-1.79 4-4 4s-4-1.79-4-4c0-1.56.89-2.91 2.19-3.6C9.73 10.83 9.5 11.66 9.5 12.5c0 .28.02.55.07.81C8.59 12.62 8 11.38 8 10c0-.79.22-1.53.6-2.16C7.01 9.07 6 11.17 6 13.5c0 3.31 2.69 6 6 6z"
        fill={color} fillOpacity={0.9}
      />
    </Svg>
  )
}

function SparkleIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6L12 2z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.2}
      />
    </Svg>
  )
}

function PeopleIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </Svg>
  )
}

function ChatIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
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

  const animIn  = useCallback(() => Animated.timing(scale, { toValue: 0.975, duration: 90,  useNativeDriver: true }).start(), [scale])
  const animOut = useCallback(() => Animated.timing(scale, { toValue: 1,     duration: 140, useNativeDriver: true }).start(), [scale])
  const handleSave = useCallback(() => { setSavedLocal((s) => !s); onSave?.() }, [onSave])

  if (isLoading) return <JobPostCardSkeleton />

  const expired      = isJobExpired(job.expiresAt)
  const listingMeta  = LISTING_META[job.listingType ?? 'JOB'] ?? LISTING_META.JOB
  const typeMeta     = TYPE_META[job.type] ?? TYPE_META.FULL_TIME
  const tags         = job.specialty.split(/[,/]/).map((t) => t.trim()).filter(Boolean)
  const statusBadge  = deriveStatusBadge(job)
  const buttonLabel  = expired ? 'Closed' : listingMeta.buttonLabel

  // Strip leading "$" — money badge icon handles the symbol
  const payDisplay     = job.payStructure.replace(/^\$\s*/, '')
  const hasSocialProof = (job.appliedToday ?? 0) > 0 || job.replyTime != null

  // Photo sources — portfolio strip removed from list card (detail view only)
  const allPhotos = job.portfolioPhotoUrls?.length ? job.portfolioPhotoUrls : (job.spacePhotos ?? [])
  const mainPhoto = job.salonCoverUrl ?? (allPhotos.length > 0 ? allPhotos[0] : null)

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[
          styles.card,
          {
            backgroundColor: theme.bg.card,
            borderColor: theme.border.subtle,
            shadowColor: '#1A1A1A',
          },
        ]}
      >
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Avatar uri={job.salonPhotoUrl} name={job.salonName} size="md" />

          <View style={styles.headerInfo}>
            {/* Name + verified */}
            <View style={styles.nameRow}>
              <Text
                style={[styles.salonName, { color: theme.text.primary }]}
                numberOfLines={1}
              >
                {job.salonName}
              </Text>
              {job.salonVerified === true && (
                <View style={styles.verifiedDot}>
                  <Text style={styles.verifiedMark}>✓</Text>
                </View>
              )}
            </View>

            {/* Location · rating */}
            <View style={styles.metaRow}>
              <PinIcon color={theme.text.tertiary} size={10} />
              <Text
                style={[styles.metaText, styles.metaCity, { color: theme.text.secondary }]}
                numberOfLines={1}
              >
                {getCityLabel(job.cityId)}
              </Text>
              {(job.salonRating ?? 0) > 0 && (
                <>
                  <Text style={[styles.metaDot, { color: theme.text.tertiary }]}>·</Text>
                  <Text style={styles.starChar}>★</Text>
                  <Text style={[styles.metaText, { color: theme.text.secondary, fontWeight: '600' }]}>
                    {job.salonRating!.toFixed(1)}
                  </Text>
                  {(job.salonReviewCount ?? 0) > 0 && (
                    <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                      {' '}({job.salonReviewCount})
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Hiring count */}
            {(job.salonHiringCount ?? 0) > 0 && (
              <View style={styles.hiringRow}>
                <PeopleIcon size={11} color={theme.text.tertiary} />
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                  {job.salonHiringCount} hiring this month
                </Text>
              </View>
            )}
          </View>

          {/* Actions: message + bookmark */}
          <View style={styles.headerActions}>
            {onMessage !== undefined && (
              <Pressable onPress={onMessage} hitSlop={10} style={styles.iconAction}>
                <ChatIcon color={theme.text.tertiary} size={17} />
              </Pressable>
            )}
            {onSave !== undefined && (
              <Pressable onPress={handleSave} hitSlop={10} style={styles.iconAction}>
                <BookmarkIcon
                  filled={savedLocal}
                  color={savedLocal ? '#D85A30' : theme.text.tertiary}
                  size={18}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── CONTENT: compact thumbnail + text ─────────────────────────────── */}
        <View style={styles.contentRow}>

          {/* Thumbnail — compact square, right-aligned */}
          {mainPhoto != null && (
            <View style={styles.mainPhotoWrap}>
              <Image
                source={{ uri: mainPhoto }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              {statusBadge !== null && (
                <View style={[styles.photoBadge, { backgroundColor: statusBadge.solidBg }]}>
                  {statusBadge.icon === 'flash'   && <FlashIcon   color="#FFFFFF" size={8} />}
                  {statusBadge.icon === 'fire'    && <FireIcon    color="#FFFFFF" size={8} />}
                  {statusBadge.icon === 'sparkle' && <SparkleIcon color="#FFFFFF" size={8} />}
                  <Text style={styles.photoBadgeText}>{statusBadge.label}</Text>
                </View>
              )}
            </View>
          )}

          {/* Text col: badge (no photo) · title · tags · space extras */}
          <View style={[styles.rightCol, mainPhoto == null && styles.rightColFull]}>

            {mainPhoto == null && statusBadge !== null && (
              <View style={[styles.inlineBadge, { backgroundColor: statusBadge.solidBg }]}>
                {statusBadge.icon === 'flash'   && <FlashIcon   color="#FFFFFF" size={8} />}
                {statusBadge.icon === 'fire'    && <FireIcon    color="#FFFFFF" size={8} />}
                {statusBadge.icon === 'sparkle' && <SparkleIcon color="#FFFFFF" size={8} />}
                <Text style={styles.photoBadgeText}>{statusBadge.label}</Text>
              </View>
            )}

            <Text
              style={[styles.jobTitle, { color: theme.text.primary }]}
              numberOfLines={2}
            >
              {job.title}
            </Text>

            <View style={styles.tagsRow}>
              {tags.slice(0, 2).map((tag, i) => (
                <View key={i} style={styles.tagSpecialty}>
                  <Text style={styles.tagSpecialtyText}>{tag}</Text>
                </View>
              ))}
              <View style={[styles.tagType, { backgroundColor: typeMeta.bg }]}>
                <Text style={[styles.tagTypeText, { color: typeMeta.color }]}>
                  {typeMeta.label}
                </Text>
              </View>
            </View>

            {/* Space extras (RENTAL / SPACE only) */}
            {job.listingType !== 'JOB' &&
              (job.spaceSize !== undefined || job.availableFrom !== undefined ||
               (job.spaceAmenities?.length ?? 0) > 0) && (
              <View style={styles.spaceExtras}>
                {job.spaceSize !== undefined && (
                  <View style={[styles.spaceTag, { backgroundColor: theme.bg.elevated }]}>
                    <Text style={[styles.spaceTagText, { color: theme.text.secondary }]}>
                      {job.spaceSize}
                    </Text>
                  </View>
                )}
                {job.availableFrom !== undefined && (
                  <View style={[styles.spaceTag, { backgroundColor: theme.bg.elevated }]}>
                    <Text style={[styles.spaceTagText, { color: theme.text.secondary }]}>
                      From {job.availableFrom}
                    </Text>
                  </View>
                )}
                {(job.spaceAmenities ?? []).slice(0, 2).map((a, i) => (
                  <View key={i} style={[styles.spaceTag, { backgroundColor: theme.bg.elevated }]}>
                    <Text style={[styles.spaceTagText, { color: theme.text.secondary }]}>{a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── DIVIDER ───────────────────────────────────────────────────────── */}
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        {/* ── FOOTER: pay · social proof · CTA ─────────────────────────────── */}
        <View style={styles.footerRow}>

          {/* Pay */}
          <View style={styles.payCol}>
            <View style={styles.payAmountRow}>
              <View style={styles.moneyBadge}>
                <Text style={styles.moneyBadgeText}>$</Text>
              </View>
              <Text
                style={[styles.payAmount, { color: '#1D9E75' }]}
                numberOfLines={1}
              >
                {payDisplay}
              </Text>
            </View>
            {job.estimatedWeekly != null && (
              <Text
                style={[styles.payEst, { color: theme.text.tertiary }]}
                numberOfLines={1}
              >
                Est. {job.estimatedWeekly}
              </Text>
            )}
          </View>

          {/* Social proof — inline, single line */}
          {hasSocialProof && (
            <View style={styles.socialCol}>
              {(job.appliedToday ?? 0) > 0 && (
                <View style={styles.socialRow}>
                  <FireIcon color="#EA580C" size={10} />
                  <Text style={[styles.socialText, { color: theme.text.secondary }]}
                    numberOfLines={1}>
                    {job.appliedToday} today
                  </Text>
                </View>
              )}
              {job.replyTime != null && (
                <View style={styles.socialRow}>
                  <FlashIcon color="#378ADD" size={10} />
                  <Text style={[styles.socialText, { color: theme.text.secondary }]}
                    numberOfLines={1}>
                    {job.replyTime}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* CTA */}
          {onApply !== undefined && (
            <Pressable
              onPress={expired ? undefined : onApply}
              style={[
                styles.applyBtn,
                expired
                  ? { backgroundColor: theme.bg.elevated }
                  : { backgroundColor: '#D85A30' },
              ]}
            >
              <Text
                style={[
                  styles.applyBtnText,
                  { color: expired ? theme.text.tertiary : '#FFFFFF' },
                ]}
              >
                {buttonLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function JobPostCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.bg.card, borderColor: theme.border.subtle },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Skeleton width={42} height={42} radius={21} />
        <View style={[styles.headerInfo, { gap: 5 }]}>
          <Skeleton width={110} height={13} radius={6} />
          <Skeleton width={130} height={10} radius={5} />
        </View>
        <View style={[styles.headerActions, { gap: 10 }]}>
          <Skeleton width={18} height={18} radius={9} />
          <Skeleton width={18} height={18} radius={9} />
        </View>
      </View>
      {/* Content */}
      <View style={styles.contentRow}>
        <Skeleton width={80} height={90} radius={10} />
        <View style={[styles.rightCol, { gap: 7 }]}>
          <Skeleton width="95%" height={14} radius={6} />
          <Skeleton width="75%" height={14} radius={6} />
          <View style={styles.tagsRow}>
            <Skeleton width={58} height={22} radius={10} />
            <Skeleton width={58} height={22} radius={10} />
          </View>
        </View>
      </View>
      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
      {/* Footer */}
      <View style={styles.footerRow}>
        <View style={[styles.payCol, { gap: 4 }]}>
          <Skeleton width={85} height={13} radius={6} />
          <Skeleton width={60} height={10} radius={5} />
        </View>
        <View style={[styles.socialCol, { gap: 4 }]}>
          <Skeleton width="85%" height={10} radius={5} />
        </View>
        <Skeleton width={84} height={32} radius={22} />
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 11,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    gap: 9,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  salonName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  verifiedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#378ADD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedMark: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  hiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '400',
    flexShrink: 0,   // rating / review numbers never truncate
  },
  metaCity: {
    flexShrink: 1,   // city name shrinks first if row is tight
    minWidth: 0,
  },
  metaDot: {
    fontSize: 11,
    marginHorizontal: 1,
  },
  starChar: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF9F27',
  },

  // Header icon actions (chat + bookmark)
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flexShrink: 0,
    paddingTop: 1,
  },
  iconAction: {
    padding: 2,
  },

  // ── Content row ─────────────────────────────────────────────────────────────
  contentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  // Compact thumbnail — 80×90, portrait ratio but much smaller
  mainPhotoWrap: {
    width: 80,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
    flexShrink: 0,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  rightCol: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rightColFull: {
    flex: 1,
  },

  // Job title
  jobTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 20,
  },

  // Chips
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagSpecialty: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(216,90,48,0.12)',
  },
  tagSpecialtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C44E28',
    letterSpacing: 0.1,
  },
  tagType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  tagTypeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Space extras
  spaceExtras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  spaceTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  spaceTagText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Divider ──────────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  payAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moneyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(29,158,117,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moneyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D9E75',
    lineHeight: 13,
  },
  payAmount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  payEst: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  socialCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  socialText: {
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },

  // CTA button — slightly smaller pill
  applyBtn: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
})
