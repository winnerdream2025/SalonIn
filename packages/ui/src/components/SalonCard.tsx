import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native'
import type { SalonCardData } from '@salonin/types'
import { formatDistance, getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'

export interface SalonCardProps {
  salon: SalonCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
}

export function SalonCard({ salon, onPress, isLoading = false, onLongPress }: SalonCardProps) {
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
    <TouchableOpacity style={CARD} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
      {/* Photo — 44×44, borderRadius 14 */}
      <View style={[PHOTO_WRAP, { backgroundColor: bgColor }]}>
        {firstPhoto
          ? <Image source={{ uri: firstPhoto }} style={PHOTO_IMG} resizeMode="cover" />
          : <Text style={PHOTO_INITIALS}>{initials}</Text>
        }
      </View>

      {/* Info */}
      <View style={INFO}>
        <View style={NAME_ROW}>
          <Text style={NAME} numberOfLines={1}>{salon.name}</Text>
          {salon.isVerified && (
            <View style={VERIFIED_BADGE}>
              <Text style={VERIFIED_TEXT}>✓ Verified</Text>
            </View>
          )}
        </View>
        {specialty.length > 0 && (
          <Text style={SUB} numberOfLines={1}>{specialty}</Text>
        )}
        {salon.isHiring && (
          <View style={HIRING_BADGE}>
            <Text style={HIRING_TEXT}>Hiring</Text>
          </View>
        )}
      </View>

      {/* Meta — distance */}
      {salon.distanceMiles !== null && (
        <View style={META}>
          <Text style={DIST}>{formatDistance(salon.distanceMiles)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function SalonCardSkeleton() {
  return (
    <View style={CARD}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={[INFO, { gap: 6 }]}>
        <Skeleton width={130} height={12} radius={6} />
        <Skeleton width={80} height={10} radius={5} />
        <Skeleton width={60} height={18} radius={9} />
      </View>
    </View>
  )
}

// ─── Constant styles ──────────────────────────────────────────────────────────

const CARD: ViewStyle = {
  backgroundColor: '#1A1A1A',
  borderRadius: 16,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
}

const PHOTO_WRAP: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const PHOTO_IMG: ImageStyle = {
  width: 44,
  height: 44,
}

const PHOTO_INITIALS: TextStyle = {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
}

const INFO: ViewStyle = {
  flex: 1,
  minWidth: 0,
  gap: 4,
}

const NAME_ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}

const NAME: TextStyle = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
  flexShrink: 1,
}

const SUB: TextStyle = {
  color: '#888888',
  fontSize: 10,
}

const META: ViewStyle = {
  alignItems: 'flex-end',
}

const DIST: TextStyle = {
  color: '#555555',
  fontSize: 9,
}

const VERIFIED_BADGE: ViewStyle = {
  backgroundColor: 'rgba(29,158,117,0.15)',
  borderRadius: 20,
  paddingVertical: 2,
  paddingHorizontal: 6,
  flexShrink: 0,
}

const VERIFIED_TEXT: TextStyle = {
  color: '#1D9E75',
  fontSize: 9,
  fontWeight: '600',
}

const HIRING_BADGE: ViewStyle = {
  backgroundColor: 'rgba(216,90,48,0.15)',
  borderRadius: 20,
  paddingVertical: 3,
  paddingHorizontal: 8,
  alignSelf: 'flex-start',
}

const HIRING_TEXT: TextStyle = {
  color: '#D85A30',
  fontSize: 9,
  fontWeight: '600',
}
