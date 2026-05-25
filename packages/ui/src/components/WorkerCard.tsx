import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native'
import type { WorkerCardData } from '@salonin/types'
import { formatDistance, formatExperience, getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { AvailabilityBadge } from './AvailabilityBadge'

export interface WorkerCardProps {
  worker: WorkerCardData
  onPress: () => void
  isLoading?: boolean
  onLongPress?: () => void
}

export function WorkerCard({ worker, onPress, isLoading = false, onLongPress }: WorkerCardProps) {
  if (isLoading) return <WorkerCardSkeleton />

  const [bgColor] = getAvatarGradient(worker.name)
  const initials = worker.name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const specialty = worker.specialties[0] ?? ''
  const expLabel = formatExperience(worker.experienceYears)
  const sub = [specialty, expLabel].filter(Boolean).join(' · ')

  return (
    <TouchableOpacity style={CARD} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
      {/* Avatar — 44×44, borderRadius 14 per design spec */}
      <View style={[AVATAR_WRAP, { backgroundColor: bgColor }]}>
        {worker.photoUrl
          ? <Image source={{ uri: worker.photoUrl }} style={AVATAR_IMG} resizeMode="cover" />
          : <Text style={AVATAR_INITIALS}>{initials}</Text>
        }
      </View>

      {/* Info */}
      <View style={INFO}>
        <Text style={NAME} numberOfLines={1}>{worker.name}</Text>
        <Text style={SUB} numberOfLines={1}>{sub}</Text>
        <View style={ROW}>
          <AvailabilityBadge status={worker.availability} />
          {worker.isVerified && (
            <View style={VERIFIED_BADGE}>
              <Text style={VERIFIED_TEXT}>✓ Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meta — distance */}
      {worker.distanceMiles !== null && (
        <View style={META}>
          <Text style={DIST}>{formatDistance(worker.distanceMiles)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function WorkerCardSkeleton() {
  return (
    <View style={CARD}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={[INFO, { gap: 6 }]}>
        <Skeleton width={120} height={12} radius={6} />
        <Skeleton width={80} height={10} radius={5} />
        <Skeleton width={90} height={18} radius={9} />
      </View>
    </View>
  )
}

// ─── Constant styles (not theme-dependent per design spec) ────────────────────

const CARD: ViewStyle = {
  backgroundColor: '#1A1A1A',
  borderRadius: 16,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
}

const AVATAR_WRAP: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const AVATAR_IMG: ImageStyle = {
  width: 44,
  height: 44,
}

const AVATAR_INITIALS: TextStyle = {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
}

const INFO: ViewStyle = {
  flex: 1,
  gap: 4,
}

const ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}

const NAME: TextStyle = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
}

const SUB: TextStyle = {
  color: '#888888',
  fontSize: 10,
}

const META: ViewStyle = {
  alignItems: 'flex-end',
  gap: 4,
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
}

const VERIFIED_TEXT: TextStyle = {
  color: '#1D9E75',
  fontSize: 9,
  fontWeight: '600',
}
