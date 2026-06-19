import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import type { ImageStyle } from 'react-native'
import type { SalonCardData } from '@salonin/types'
import { formatDistance, getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

export interface SalonCardProps {
  salon: SalonCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
}

export function SalonCard({ salon, onPress, isLoading = false, onLongPress }: SalonCardProps) {
  const { theme } = useTheme()
  if (isLoading) return <SalonCardSkeleton />

  const [bgColor] = getAvatarGradient(salon.name)
  const initials = salon.name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const firstPhoto = salon.photoUrls[0] ?? null
  const specialty = salon.specialties[0] ?? ''

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Photo — 44×44, borderRadius 14 */}
      <View style={[styles.photoWrap, { backgroundColor: bgColor }]}>
        {firstPhoto
          ? <Image source={{ uri: firstPhoto }} style={styles.photoImg as ImageStyle} resizeMode="cover" />
          : <Text style={styles.photoInitials}>{initials}</Text>
        }
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
            {salon.name}
          </Text>
          {salon.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        {specialty.length > 0 && (
          <Text style={[styles.sub, { color: theme.text.secondary }]} numberOfLines={1}>
            {specialty}
          </Text>
        )}
        {salon.isHiring && (
          <View style={styles.hiringBadge}>
            <Text style={styles.hiringText}>Hiring</Text>
          </View>
        )}
      </View>

      {/* Meta — distance */}
      {salon.distanceMiles !== null && (
        <View style={styles.meta}>
          <Text style={[styles.dist, { color: theme.text.tertiary }]}>
            {formatDistance(salon.distanceMiles)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function SalonCardSkeleton() {
  const { theme } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={[styles.info, { gap: 6 }]}>
        <Skeleton width={130} height={12} radius={6} />
        <Skeleton width={80} height={10} radius={5} />
        <Skeleton width={60} height={18} radius={9} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  photoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  photoImg: {
    width: 44,
    height: 44,
  },
  photoInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  sub: {
    fontSize: 12,
    fontWeight: '400',
  },
  meta: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  dist: {
    fontSize: 11,
    fontWeight: '500',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  verifiedText: {
    color: '#147A5A',
    fontSize: 10,
    fontWeight: '600',
  },
  hiringBadge: {
    backgroundColor: 'rgba(216,90,48,0.12)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  hiringText: {
    color: '#D85A30',
    fontSize: 10,
    fontWeight: '700',
  },
})
