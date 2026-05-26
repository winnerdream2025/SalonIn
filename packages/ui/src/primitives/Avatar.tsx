import React from 'react'
import { View, Image, ViewStyle } from 'react-native'
import { Skeleton } from './Skeleton'
import { getAvatarGradient } from '@salonin/utils'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  uri?: string | null
  name: string
  size?: AvatarSize
  className?: string
}

const DIMS: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56, xl: 80 }

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dim = DIMS[size]
  const [bgColor] = getAvatarGradient(name)

  const baseStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  if (uri) {
    return (
      <View style={[baseStyle, { backgroundColor: bgColor }]}>
        <Image source={{ uri }} style={{ width: dim, height: dim }} resizeMode="cover" />
      </View>
    )
  }

  return <View style={[baseStyle, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
}

export function AvatarSkeleton({ size = 'md' }: { size?: AvatarSize }) {
  const dim = DIMS[size]
  return <Skeleton width={dim} height={dim} radius={dim / 2} />
}
