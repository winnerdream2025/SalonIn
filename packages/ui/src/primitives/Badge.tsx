import React from 'react'
import { View, Text, ViewStyle, TextStyle } from 'react-native'
import type { Availability } from '@salonin/types'
import { AVAILABILITY_LABELS } from '@salonin/utils'
import { useTheme } from '../hooks/useTheme'
import { Skeleton } from './Skeleton'

export interface BadgeProps {
  label?: string
  availability?: Availability
  className?: string
}

export function Badge({ label, availability }: BadgeProps) {
  const { theme } = useTheme()

  const AVAIL_COLORS: Record<Availability, string> = {
    NOW: theme.avail.now,
    TODAY: theme.avail.today,
    WEEKEND: theme.avail.weekend,
    NOT_AVAILABLE: theme.avail.none,
  }

  const accent = availability ? AVAIL_COLORS[availability] : theme.text.secondary
  const bgColor = accent + '20'
  const displayLabel = label ?? (availability ? AVAILABILITY_LABELS[availability] : '')

  const containerStyle: ViewStyle = {
    backgroundColor: bgColor,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  }

  const textStyle: TextStyle = {
    color: accent,
    fontSize: 12,
    fontWeight: '600',
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{displayLabel}</Text>
    </View>
  )
}

export function BadgeSkeleton() {
  return <Skeleton width={80} height={24} radius={100} />
}
