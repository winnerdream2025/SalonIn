import React from 'react'
import { View, Text, Image, ViewStyle, ImageStyle } from 'react-native'
import { getAvatarGradient } from '@salonin/utils'
import { Skeleton } from './Skeleton'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  uri?: string | null
  name: string
  size?: AvatarSize
  className?: string
  isVerified?: boolean
  style?: ViewStyle
}

const DIMS: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56, xl: 80 }

export function Avatar({ uri, name: _name, size = 'md', isVerified, style }: AvatarProps) {
  const dim = DIMS[size]
  const badgeSize = dim <= 40 ? 14 : 17
  const [bgColor] = getAvatarGradient(_name)
  const initial = (_name[0] ?? '?').toUpperCase()

  const imgStyle: ImageStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
  }

  const initialsCircle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <View style={[{ width: dim, height: dim, position: 'relative' }, style]}>
      {uri ? (
        <Image source={{ uri }} style={imgStyle} resizeMode="cover" />
      ) : (
        <View style={initialsCircle}>
          <Text style={{ color: '#fff', fontSize: dim * 0.38, fontWeight: '700', lineHeight: dim * 0.44 }}>
            {initial}
          </Text>
        </View>
      )}
      {isVerified === true && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: '#1D9E75',
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: badgeSize <= 14 ? 7 : 8, color: '#fff', fontWeight: '800' }}>✓</Text>
        </View>
      )}
    </View>
  )
}

export function AvatarSkeleton({ size = 'md' }: { size?: AvatarSize }) {
  const dim = DIMS[size]
  return <Skeleton width={dim} height={dim} radius={dim / 2} />
}
