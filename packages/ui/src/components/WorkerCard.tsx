import React, { useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
import { formatDistance, formatExperience } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { AvailabilityBadge } from './AvailabilityBadge'
import { Avatar } from '../primitives/Avatar'
import { useTheme } from '../hooks/useTheme'

export interface WorkerCardProps {
  worker: WorkerCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
  onMessage?: () => void
}

export function WorkerCard({ worker, onPress, isLoading = false, onLongPress, onMessage }: WorkerCardProps) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current

  const animIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start()
  }, [scale])

  const animOut = useCallback(() => {
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }, [scale])

  if (isLoading) return <WorkerCardSkeleton />

  const specialty = worker.specialties[0] ?? ''
  const expLabel = formatExperience(worker.experienceYears)
  const specialtyLine = [specialty, expLabel].filter(Boolean).join(' · ')
  const extraSpecialties = worker.specialties.slice(1, 3)

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
        }]}
      >
        {/* ── Top row: avatar + name/specialty/location ── */}
        <View style={styles.topRow}>
          <Avatar uri={worker.photoUrl} name={worker.name} size="lg" isVerified={worker.isVerified} />
          <View style={styles.topInfo}>
            <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
              {worker.name}
            </Text>
            <Text style={[styles.specialty, { color: theme.text.secondary }]} numberOfLines={1}>
              {specialtyLine}
            </Text>
            <Text style={[styles.location, { color: theme.text.tertiary }]} numberOfLines={1}>
              {worker.cityId.toUpperCase()}
              {worker.distanceMiles !== null ? `  ·  ${formatDistance(worker.distanceMiles)}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Separator ── */}
        <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />

        {/* ── Tags row: availability + specialty pills ── */}
        <View style={styles.tagsRow}>
          <AvailabilityBadge status={worker.availability} />
          {extraSpecialties.map((s) => (
            <View key={s} style={[styles.specPill, { backgroundColor: theme.bg.elevated }]}>
              <Text style={[styles.specPillText, { color: theme.text.secondary }]} numberOfLines={1}>{s}</Text>
            </View>
          ))}
        </View>

        {/* ── Separator ── */}
        <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />

        {/* ── Stats + Message button ── */}
        <View style={styles.statsRow}>
          <View style={styles.statsLeft}>
            {worker.isVerified && (
              <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                <Text style={{ color: '#1D9E75' }}>✓ Verified</Text>
              </Text>
            )}
            {worker.rating !== undefined && (
              <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                {'  ·  '}<Text style={{ fontWeight: '700' }}>{worker.rating.toFixed(1)}</Text>
              </Text>
            )}
            {worker.jobsDone !== undefined && (
              <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                {'  ·  '}{worker.jobsDone} jobs
              </Text>
            )}
          </View>
          {onMessage && (
            <Pressable
              onPress={onMessage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.messageBtn}>Message →</Text>
            </Pressable>
          )}
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
        <Skeleton width={56} height={56} radius={28} />
        <View style={[styles.topInfo, { gap: 8 }]}>
          <Skeleton width={130} height={14} radius={7} />
          <Skeleton width={100} height={11} radius={5} />
          <Skeleton width={80} height={10} radius={5} />
        </View>
      </View>
      <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />
      <View style={[styles.tagsRow, { gap: 6 }]}>
        <Skeleton width={100} height={22} radius={11} />
        <Skeleton width={70} height={22} radius={11} />
      </View>
      <View style={[styles.sep, { backgroundColor: theme.border.subtle }]} />
      <View style={styles.statsRow}>
        <Skeleton width={160} height={11} radius={5} />
        <Skeleton width={70} height={11} radius={5} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  topInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingTop: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  specialty: {
    fontSize: 13,
  },
  location: {
    fontSize: 12,
  },
  sep: {
    height: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  specPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  specPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statText: {
    fontSize: 12,
  },
  messageBtn: {
    color: '#D85A30',
    fontSize: 13,
    fontWeight: '700',
  },
})
