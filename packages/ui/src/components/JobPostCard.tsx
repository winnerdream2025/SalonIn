import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native'
import type { JobPostCardData } from '@salonin/types'
import { isJobExpired, getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'

export interface JobPostCardProps {
  job: JobPostCardData
  onPress: () => void
  isLoading?: boolean
}

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
}

export function JobPostCard({ job, onPress, isLoading = false }: JobPostCardProps) {
  if (isLoading) return <JobPostCardSkeleton />

  const [bgColor] = getAvatarGradient(job.salonName)
  const expired = isJobExpired(job.expiresAt)
  const typeLabel = TYPE_LABEL[job.type] ?? job.type

  const expiryStr = expired
    ? 'Expired'
    : `Exp ${new Date(job.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <TouchableOpacity style={CARD} onPress={onPress} activeOpacity={0.8}>
      {/* Salon avatar */}
      <View style={[AVATAR_WRAP, { backgroundColor: bgColor }]}>
        {job.salonPhotoUrl ? (
          <Image
            source={{ uri: job.salonPhotoUrl }}
            style={AVATAR_IMG}
            resizeMode="cover"
          />
        ) : (
          <Text style={AVATAR_INITIALS}>{job.salonName[0]?.toUpperCase() ?? 'S'}</Text>
        )}
      </View>

      {/* Info */}
      <View style={INFO}>
        <Text style={TITLE} numberOfLines={2} ellipsizeMode="tail">{job.title}</Text>
        <Text style={SALON_NAME} numberOfLines={1}>{job.salonName}</Text>
        <Text style={META} numberOfLines={1}>{job.specialty} · {typeLabel}</Text>
        <View style={BOTTOM_ROW}>
          <Text style={PAY}>{job.payStructure}</Text>
          <Text style={expired ? EXPIRY_EXPIRED : EXPIRY}>{expiryStr}</Text>
        </View>
      </View>

      {/* Urgent badge */}
      {job.isUrgent && !expired && (
        <View style={URGENT_WRAP}>
          <Text style={URGENT_TEXT}>URGENT</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function JobPostCardSkeleton() {
  return (
    <View style={CARD}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={[INFO, { gap: 6 }]}>
        <Skeleton width={140} height={12} radius={6} />
        <Skeleton width={90} height={10} radius={5} />
        <Skeleton width={110} height={10} radius={5} />
        <Skeleton width={130} height={10} radius={5} />
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  fontSize: 18,
  fontWeight: '700',
}

const INFO: ViewStyle = {
  flex: 1,
  minWidth: 0,
  gap: 3,
}

const TITLE: TextStyle = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
}

const SALON_NAME: TextStyle = {
  color: '#888888',
  fontSize: 10,
}

const META: TextStyle = {
  color: '#666666',
  fontSize: 10,
}

const BOTTOM_ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 2,
}

const PAY: TextStyle = {
  color: '#D85A30',
  fontSize: 10,
  fontWeight: '600',
}

const EXPIRY: TextStyle = {
  color: '#555555',
  fontSize: 9,
}

const EXPIRY_EXPIRED: TextStyle = {
  color: '#E74C3C',
  fontSize: 9,
}

const URGENT_WRAP: ViewStyle = {
  backgroundColor: 'rgba(239,159,39,0.15)',
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 3,
  alignSelf: 'flex-start',
  flexShrink: 0,
}

const URGENT_TEXT: TextStyle = {
  color: '#EF9F27',
  fontSize: 8,
  fontWeight: '800',
  letterSpacing: 0.5,
}
