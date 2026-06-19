import React from 'react'
import { View, Text } from 'react-native'
import type { ViewStyle, TextStyle } from 'react-native'
import type { Availability } from '@salonin/types'

interface AvailabilityConfig {
  label: string
  bg: string
  text: string
  dot: string
}

// Light-mode-first: readable on warm stone bg (#EDE8E3) and white cards
const CONFIG: Record<Availability, AvailabilityConfig> = {
  NOW:          { label: 'Available now',   bg: 'rgba(29,158,117,0.11)',  text: '#147A5A', dot: '#1D9E75' },
  TODAY:        { label: 'Available today', bg: 'rgba(55,138,221,0.11)',  text: '#2568B0', dot: '#378ADD' },
  WEEKEND:      { label: 'This weekend',    bg: 'rgba(239,159,39,0.11)',  text: '#A06910', dot: '#EF9F27' },
  NOT_AVAILABLE:{ label: 'Not available',   bg: 'rgba(107,107,107,0.11)', text: '#6B6B6B', dot: '#9CA3AF' },
}

export interface AvailabilityBadgeProps {
  status: Availability
}

export function AvailabilityBadge({ status }: AvailabilityBadgeProps) {
  const c = CONFIG[status]

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  }

  const dotStyle: ViewStyle = {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.dot,
  }

  const labelStyle: TextStyle = {
    color: c.text,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  }

  return (
    <View style={rowStyle}>
      <View style={dotStyle} />
      <Text style={labelStyle}>{c.label}</Text>
    </View>
  )
}
