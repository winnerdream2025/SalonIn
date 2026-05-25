import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native'
import type { PortfolioItem as PortfolioItemData } from '@salonin/types'
import { Skeleton } from '../primitives/Skeleton'

export interface PortfolioItemProps {
  item: PortfolioItemData
  onPress: (item: PortfolioItemData) => void
}

export function PortfolioItem({ item, onPress }: PortfolioItemProps) {
  const isVideo = item.type === 'VIDEO'

  return (
    <TouchableOpacity
      style={WRAP}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.mediaUrl }} style={MEDIA} resizeMode="cover" />

      {isVideo && (
        <View style={PLAY_OVERLAY}>
          <View style={PLAY_CIRCLE}>
            <Text style={PLAY_ICON}>▶</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function PortfolioItemSkeleton() {
  return (
    <View style={WRAP}>
      <Skeleton width="100%" height={120} radius={4} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const WRAP: ViewStyle = {
  flex: 1,
  aspectRatio: 1,
  padding: 1,
  overflow: 'hidden',
}

const MEDIA: ImageStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 4,
}

const PLAY_OVERLAY: ViewStyle = {
  ...{ position: 'absolute' as const },
  top: 1,
  left: 1,
  right: 1,
  bottom: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.35)',
  borderRadius: 4,
}

const PLAY_CIRCLE: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: 'rgba(255,255,255,0.2)',
  alignItems: 'center',
  justifyContent: 'center',
}

const PLAY_ICON: TextStyle = {
  color: '#FFFFFF',
  fontSize: 12,
  marginLeft: 2,
}
