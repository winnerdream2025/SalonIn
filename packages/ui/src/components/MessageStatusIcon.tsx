import React from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import type { MessageStatus } from '@salonin/types'
import { useTheme } from '../hooks/useTheme'

export interface MessageStatusIconProps {
  status: MessageStatus
  tint?: string
}

function SingleCheck({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4 4 10-10"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function DoubleCheck({ color }: { color: string }) {
  return (
    <Svg width={18} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13l4 4 10-10"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 13l4 4 10-10"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function FailedIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
        fill={color}
      />
    </Svg>
  )
}

function SendingIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5.5h-2v5l4.5 2.7.9-1.45L13 11.5V7.5z"
        fill={color}
      />
    </Svg>
  )
}

export function MessageStatusIcon({ status, tint }: MessageStatusIconProps) {
  const { theme } = useTheme()
  const mutedColor = tint ?? theme.text.tertiary
  const brandColor = theme.brand.primary
  const failedColor = '#E53935'

  switch (status) {
    case 'sending':
      return (
        <View style={styles.icon}>
          <SendingIcon color={mutedColor} />
        </View>
      )
    case 'sent':
      return (
        <View style={styles.icon}>
          <SingleCheck color={mutedColor} />
        </View>
      )
    case 'delivered':
      return (
        <View style={styles.icon}>
          <DoubleCheck color={mutedColor} />
        </View>
      )
    case 'read':
      return (
        <View style={styles.icon}>
          <DoubleCheck color={brandColor} />
        </View>
      )
    case 'failed':
      return (
        <View style={styles.icon}>
          <FailedIcon color={failedColor} />
        </View>
      )
    default:
      return null
  }
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
})
