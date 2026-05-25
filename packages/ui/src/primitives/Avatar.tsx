import React from 'react'
import { View, Image, Text, ViewStyle, TextStyle } from 'react-native'
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
const FONT: Record<AvatarSize, number> = { sm: 12, md: 15, lg: 20, xl: 28 }

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dim = DIMS[size]
  const [bgColor] = getAvatarGradient(name)
  const initials = name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  const textStyle: TextStyle = {
    color: '#FFFFFF',
    fontSize: FONT[size],
    fontWeight: '700',
  }

  return (
    <View style={containerStyle}>
      {uri
        ? <Image source={{ uri }} style={{ width: dim, height: dim }} resizeMode="cover" />
        : <Text style={textStyle}>{initials}</Text>
      }
    </View>
  )
}

export function AvatarSkeleton({ size = 'md' }: { size?: AvatarSize }) {
  const dim = DIMS[size]
  return <Skeleton width={dim} height={dim} radius={dim / 2} />
}
