import React, { useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
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

export function JobPostCard({ job, onPress, isLoading = false, onApply, onSave, isSaved = false }: JobPostCardProps) {
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
  const expiryColor = expired ? theme.semantic.error.text : days <= 2 ? theme.semantic.error.text : theme.text.tertiary
  const expiryStr = expired ? 'Expired' : `Expires in ${days}d`

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[styles.card, {
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default,
        }]}
      >
        {/* ── Salon header ── */}
        <View style={styles.salonRow}>
          <Avatar uri={job.salonPhotoUrl} name={job.salonName} size="sm" />
          <View style={styles.salonInfo}>
            <Text style={[styles.salonName, { color: theme.text.secondary }]} numberOfLines={1}>
              {job.salonName}
            </Text>
            <Text style={[styles.salonLoc, { color: theme.text.tertiary }]} numberOfLines={1}>
              {job.cityId.toUpperCase()}
            </Text>
          </View>
          {job.isUrgent && !expired && (
            <View style={styles.urgentPill}>
              <View style={styles.urgentDot} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        {/* ── Separator ── */}
        <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />

        {/* ── Job title ── */}
        <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2} ellipsizeMode="tail">
          {job.title}
        </Text>

        {/* ── Pills row ── */}
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.pillText, { color: theme.text.secondary }]}>{job.specialty}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(55,138,221,0.12)' }]}>
            <Text style={[styles.pillText, { color: '#60B4FF' }]}>{typeLabel}</Text>
          </View>
        </View>

        {/* ── Separator ── */}
        <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />

        {/* ── Info rows ── */}
        <View style={styles.infoRows}>
          <Text style={[styles.infoRow, { color: theme.text.secondary }]} numberOfLines={1}>
            {'Pay  '}<Text style={{ color: '#D85A30', fontWeight: '700' }}>{job.payStructure}</Text>
          </Text>
          <Text style={[styles.infoRow, { color: expiryColor }]} numberOfLines={1}>
            {expiryStr}
          </Text>
          {job.applicantCount !== undefined && (
            <Text style={[styles.infoRow, { color: job.applicantCount > 10 ? '#EF9F27' : theme.text.secondary }]} numberOfLines={1}>
              {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* ── Footer: save + apply ── */}
        {(onSave ?? onApply) && (
          <>
            <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />
            <View style={styles.footer}>
              {onSave && (
                <Pressable onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.saveBtn, { color: isSaved ? '#D85A30' : theme.text.tertiary }]}>
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              )}
              {onApply && !expired && (
                <Pressable
                  onPress={onApply}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply now →</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

export function JobPostCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
      <View style={styles.salonRow}>
        <Skeleton width={32} height={32} radius={16} />
        <View style={[styles.salonInfo, { gap: 6 }]}>
          <Skeleton width={100} height={11} radius={5} />
          <Skeleton width={70} height={10} radius={5} />
        </View>
      </View>
      <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />
      <Skeleton width={220} height={20} radius={5} />
      <View style={styles.pillsRow}>
        <Skeleton width={80} height={22} radius={11} />
        <Skeleton width={70} height={22} radius={11} />
      </View>
      <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />
      <View style={{ gap: 8 }}>
        <Skeleton width={130} height={11} radius={5} />
        <Skeleton width={100} height={11} radius={5} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  salonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  salonInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  salonName: {
    fontSize: 13,
    fontWeight: '500',
  },
  salonLoc: {
    fontSize: 11,
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,159,39,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(239,159,39,0.3)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF9F27',
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF9F27',
  },
  sep: {
    height: 0.5,
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
  infoRows: {
    gap: 6,
  },
  infoRow: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})
