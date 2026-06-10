import React, { useRef, useCallback, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
import type { JobPostCardData } from '@salonin/types'
import { isJobExpired } from '@salonin/utils'
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

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
  CONTRACT: 'Contract',
  SEASONAL: 'Seasonal',
  APPRENTICESHIP: 'Apprenticeship',
  FREELANCE: 'Freelance',
}

const TYPE_PILL_COLOR: Record<string, { bg: string; text: string }> = {
  FULL_TIME:       { bg: 'rgba(29,158,117,0.1)',  text: '#1D9E75' },
  PART_TIME:       { bg: 'rgba(147,92,255,0.1)',  text: '#935CFF' },
  TEMPORARY:       { bg: 'rgba(55,138,221,0.1)',  text: '#378ADD' },
  WEEKEND:         { bg: 'rgba(239,159,39,0.1)',   text: '#EF9F27' },
  EMERGENCY:       { bg: 'rgba(226,75,74,0.1)',    text: '#E24B4A' },
  CONTRACT:        { bg: 'rgba(75,85,99,0.1)',     text: '#4B5563' },
  SEASONAL:        { bg: 'rgba(234,88,12,0.1)',    text: '#EA580C' },
  APPRENTICESHIP:  { bg: 'rgba(139,92,246,0.1)',   text: '#8B5CF6' },
  FREELANCE:       { bg: 'rgba(6,182,212,0.1)',    text: '#06B6D4' },
}

const LISTING_LABEL: Record<string, string> = {
  JOB: 'Job',
  RENTAL: 'Rental',
  SPACE: 'Space',
}

const LISTING_PILL_COLOR: Record<string, { bg: string; text: string }> = {
  JOB:    { bg: 'rgba(29,158,117,0.1)',  text: '#1D9E75' },
  RENTAL: { bg: 'rgba(234,88,12,0.1)',   text: '#EA580C' },
  SPACE:  { bg: 'rgba(139,92,246,0.1)',  text: '#8B5CF6' },
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

function MapPinIcon({ size = 13 }: { size?: number }) {
  const w = Math.round(size * 0.78)
  return (
    <Svg width={w} height={size} viewBox="0 0 14 18" fill="none">
      <Path
        d="M7 0C4.24 0 2 2.24 2 5c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5zm0 7.5C5.62 7.5 4.5 6.38 4.5 5S5.62 2.5 7 2.5 9.5 3.62 9.5 5 8.38 7.5 7 7.5z"
        fill="#E53935"
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
  const coverUri = job.salonCoverUrl ?? job.salonPhotoUrl ?? null

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
        {/* ── HEADER: salon logo + name/meta + bookmark (top-right) ── */}
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
            {/* Rating row — right under name */}
            <View style={styles.ratingRow}>
              <Text style={{ color: '#EF9F27', fontSize: 12, fontWeight: '700' }}>★</Text>
              <Text style={[styles.ratingText, { color: theme.text.secondary }]}>
                {(job.salonRating ?? 0).toFixed(1)}
              </Text>
              <Text style={{ color: theme.text.tertiary, fontSize: 11 }}>
                ({job.salonReviewCount ?? 0})
              </Text>
              {job.salonHiringCount != null && job.salonHiringCount > 0 && (
                <>
                  <Text style={{ color: theme.text.tertiary, fontSize: 11 }}> · </Text>
                  <Text style={{ color: '#D85A30', fontSize: 11, fontWeight: '600' }}>
                    {job.salonHiringCount} open
                  </Text>
                </>
              )}
            </View>
            {/* City row */}
            <View style={styles.metaRow}>
              <MapPinIcon size={13} />
              <Text style={[styles.metaText, { color: theme.text.tertiary }]} numberOfLines={1}>
                {formatCity(job.cityId)}
              </Text>
            </View>
          </View>
          {onSave && (
            <Pressable
              onPress={handleSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.bookmarkBtn}
            >
              <BookmarkIcon
                filled={savedLocal}
                color={savedLocal ? theme.brand.primary : theme.text.tertiary}
                size={20}
              />
            </Pressable>
          )}
        </View>

        {/* ── BODY: left thumb (cover image or initials) + pills/description ── */}
        <View style={styles.bodyRow}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImg} resizeMode="cover" />
          ) : (
            <View style={[styles.coverInitials, { backgroundColor: theme.brand.primary + '18' }]}>
              <Text style={[styles.coverInitialsText, { color: theme.brand.primary }]}>
                {(job.salonName[0] ?? 'S').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.bodyRight}>
            {/* Pills — single line: listing type + first specialty + +N + employment type */}
            {(() => {
              const tags = job.specialty.split(/[,/]/).map((t) => t.trim()).filter(Boolean)
              const firstTag = tags[0]
              const overflow = tags.length - 1
              return (
                <View style={styles.pillsRow}>
                  {job.listingType && job.listingType !== 'JOB' && (
                    <View style={[styles.pill, { backgroundColor: (LISTING_PILL_COLOR[job.listingType] ?? LISTING_PILL_COLOR.JOB).bg }]}>
                      <Text style={[styles.pillText, { color: (LISTING_PILL_COLOR[job.listingType] ?? LISTING_PILL_COLOR.JOB).text }]}>{LISTING_LABEL[job.listingType] ?? job.listingType}</Text>
                    </View>
                  )}
                  {firstTag ? (
                    <View style={[styles.pill, styles.pillCoral]}>
                      <Text style={[styles.pillText, styles.pillCoralText]}>{firstTag}</Text>
                    </View>
                  ) : null}
                  {overflow > 0 && (
                    <View style={[styles.pill, styles.pillCoral]}>
                      <Text style={[styles.pillText, styles.pillCoralText]}>+{overflow}</Text>
                    </View>
                  )}
                  <View style={[styles.pill, { backgroundColor: (TYPE_PILL_COLOR[job.type] ?? TYPE_PILL_COLOR.FULL_TIME).bg }]}>
                    <Text style={[styles.pillText, { color: (TYPE_PILL_COLOR[job.type] ?? TYPE_PILL_COLOR.FULL_TIME).text }]}>{typeLabel}</Text>
                  </View>
                </View>
              )
            })()}
            {job.description ? (
              <Text style={[styles.description, { color: theme.text.secondary }]} numberOfLines={2} ellipsizeMode="tail">
                {job.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── PHOTOS STRIP ── */}
        {(() => {
          const photos = (job.portfolioPhotoUrls?.length ? job.portfolioPhotoUrls : (job.spacePhotos ?? []))
          if (photos.length === 0) return null
          return (
            <View style={styles.photosStrip}>
              {photos.slice(0, 3).map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
              ))}
              {photos.length > 3 && (
                <View style={[styles.photoMore, { backgroundColor: theme.bg.elevated }]}>
                  <Text style={[styles.photoMoreText, { color: theme.text.secondary }]}>+{photos.length - 3}</Text>
                </View>
              )}
            </View>
          )
        })()}

        {/* ── DIVIDER ── */}
        <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

        {/* ── FOOTER: 3-column — pay | engagement | actions ── */}
        <View style={styles.footerRow}>
          <View style={styles.payCol}>
            <Text style={[styles.payText, { color: theme.text.primary }]} numberOfLines={1}>
              {job.payStructure}
            </Text>
            {(job.applicantCount ?? 0) > 0 && (
              <Text style={[styles.payEstimate, { color: theme.text.tertiary }]} numberOfLines={1}>
                {job.applicantCount} applicants
              </Text>
            )}
          </View>

          <View style={styles.actionsCol}>
            {onMessage && (
              <Pressable
                onPress={onMessage}
                style={[styles.messageBtnIconOnly, { backgroundColor: theme.bg.input }]}
              >
                <ChatIcon color={theme.text.primary} size={16} />
              </Pressable>
            )}
            {onApply && !expired && (
              <Pressable
                onPress={onApply}
                style={[styles.applyBtn, { backgroundColor: theme.brand.primary }]}
              >
                <Text style={[styles.applyBtnText, { color: '#FFFFFF' }]}>Apply Now</Text>
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
      </View>
      <View style={styles.bodyRow}>
        <Skeleton width={80} height={80} radius={10} />
        <View style={[styles.bodyRight, { gap: 6 }]}>
          <View style={styles.pillsRow}>
            <Skeleton width={60} height={18} radius={10} />
            <Skeleton width={56} height={18} radius={10} />
          </View>
          <Skeleton width="100%" height={14} radius={5} />
          <Skeleton width="80%" height={14} radius={5} />
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
      <View style={styles.footerRow}>
        <View style={[styles.payCol, { gap: 4 }]}>
          <Skeleton width={100} height={13} radius={5} />
          <Skeleton width={80} height={10} radius={5} />
        </View>
        <View style={styles.actionsCol}>
          <Skeleton width={36} height={36} radius={18} />
          <Skeleton width={100} height={36} radius={18} />
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
    gap: 4,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 1,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '400',
    flex: 1,
    marginLeft: 2,
  },
  // ── Body ──
  bodyRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  coverImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  coverInitials: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coverInitialsText: {
    fontSize: 30,
    fontWeight: '800',
  },
  bookmarkBtn: {
    padding: 4,
  },
  bodyRight: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 5,
    overflow: 'hidden',
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
  // ── Photos strip ──
  photosStrip: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
    overflow: 'hidden' as const,
  },
  photoMore: {
    width: 52,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  photoMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Divider ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 3,
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
  payText: {
    fontSize: 13,
    fontWeight: '700',
  },
  payEstimate: {
    fontSize: 11,
    fontWeight: '400',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyBtn: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  messageBtnIconOnly: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
})
