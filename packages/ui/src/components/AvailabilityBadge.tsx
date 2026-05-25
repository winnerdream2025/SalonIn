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

const CONFIG: Record<Availability, AvailabilityConfig> = {
  NOW:          { label: 'Available now',   bg: 'rgba(29,158,117,0.2)',  text: '#2DD4A0', dot: '#1D9E75' },
  TODAY:        { label: 'Available today', bg: 'rgba(55,138,221,0.2)',  text: '#60B4FF', dot: '#378ADD' },
  WEEKEND:      { label: 'This weekend',    bg: 'rgba(239,159,39,0.2)',  text: '#FABC4E', dot: '#EF9F27' },
  NOT_AVAILABLE:{ label: 'Not available',   bg: 'rgba(85,85,85,0.2)',    text: '#666666', dot: '#444444' },
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
    fontSize: 9,
    fontWeight: '600',
  }

  return (
    <View style={rowStyle}>
      <View style={dotStyle} />
      <Text style={labelStyle}>{c.label}</Text>
    </View>
  )
}
