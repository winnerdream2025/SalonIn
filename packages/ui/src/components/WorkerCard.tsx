import React, { useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native'
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
  const extraSpecialties = worker.specialties.slice(1, 3)
  const moreCount = worker.specialties.length - 3
  const hasPortfolio = (worker.portfolioUrls?.length ?? 0) > 0

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={animIn}
        onPressOut={animOut}
        style={[styles.card, {
          backgroundColor: theme.bg.card,
          shadowColor: '#000000',
        }]}
      >
        {/* ── Top row: avatar + info + message ── */}
        <View style={styles.topRow}>
          <Avatar uri={worker.photoUrl} name={worker.name} size="lg" isVerified={worker.isVerified} />
          <View style={styles.topInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
                {worker.name}
              </Text>
            </View>
            <Text style={[styles.metaText, { color: theme.text.secondary }]} numberOfLines={1}>
              {specialty}{expLabel ? ` · ${expLabel}` : ''}
            </Text>
            <Text style={[styles.metaText, { color: theme.text.tertiary }]} numberOfLines={1}>
              {worker.cityId.toUpperCase()}
              {worker.distanceMiles != null ? `  ·  ${formatDistance(worker.distanceMiles)}` : ''}
            </Text>
          </View>
          {onMessage && (
            <Pressable
              onPress={onMessage}
              style={[styles.msgBtn, { backgroundColor: theme.brand.primary }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.msgBtnText}>Message</Text>
            </Pressable>
          )}
        </View>

        {/* ── Tags row: availability + specialty pills ── */}
        <View style={styles.tagsRow}>
          <AvailabilityBadge status={worker.availability} />
          {extraSpecialties.map((s) => (
            <View key={s} style={[styles.specPill, { backgroundColor: theme.bg.input }]}>
              <Text style={[styles.specPillText, { color: theme.text.secondary }]} numberOfLines={1}>{s}</Text>
            </View>
          ))}
          {moreCount > 0 && (
            <View style={[styles.specPill, { backgroundColor: theme.bg.input }]}>
              <Text style={[styles.specPillText, { color: theme.text.tertiary }]}>+{moreCount}</Text>
            </View>
          )}
        </View>

        {/* ── Portfolio + stats ── */}
        {(hasPortfolio || worker.rating != null || worker.jobsDone != null) && (
          <View style={styles.bottomRow}>
            {hasPortfolio && (
              <View style={styles.portfolioRow}>
                {worker.portfolioUrls?.slice(0, 3).map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} />
                ))}
              </View>
            )}
            <View style={styles.statsRow}>
              {worker.rating != null && (
                <Text style={[styles.statText, { color: theme.text.secondary }]}>
                  ★ <Text style={{ fontWeight: '700' }}>{worker.rating.toFixed(1)}</Text>
                </Text>
              )}
              {worker.jobsDone != null && (
                <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                  {' · '}{worker.jobsDone} jobs
                </Text>
              )}
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

export function WorkerCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card }]}>
      <View style={styles.topRow}>
        <Skeleton width={56} height={56} radius={28} />
        <View style={[styles.topInfo, { gap: 8 }]}>
          <Skeleton width={130} height={16} radius={8} />
          <Skeleton width={100} height={12} radius={6} />
          <Skeleton width={80} height={12} radius={6} />
        </View>
        <Skeleton width={70} height={28} radius={8} />
      </View>
      <View style={styles.tagsRow}>
        <Skeleton width={100} height={24} radius={12} />
        <Skeleton width={70} height={24} radius={12} />
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.portfolioRow}>
          <Skeleton width={48} height={48} radius={24} />
          <Skeleton width={48} height={48} radius={24} />
          <Skeleton width={48} height={48} radius={24} />
        </View>
        <Skeleton width={100} height={12} radius={6} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  topInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 13,
  },
  msgBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  msgBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  specPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  specPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portfolioRow: {
    flexDirection: 'row',
    gap: 6,
  },
  portfolioThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EDE8',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
  },
})
