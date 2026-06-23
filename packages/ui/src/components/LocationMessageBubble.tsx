import React from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'

export interface LocationMessageBubbleProps {
  latitude: number
  longitude: number
  locationName?: string | null
  isSelf: boolean
  onLongPress?: () => void
}

export function LocationMessageBubble({ latitude, longitude, locationName, isSelf, onLongPress }: LocationMessageBubbleProps) {
  const { theme } = useTheme()
  const textColor = isSelf ? '#FFFFFF' : theme.text.primary
  const subColor = isSelf ? 'rgba(255,255,255,0.7)' : theme.text.secondary

  const openMap = () => {
    const label = encodeURIComponent(locationName ?? 'Location')
    // Platform-native deep links: Apple Maps on iOS, Google Maps geo: on Android
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        void Linking.openURL(url)
      } else {
        // Fallback to Google Maps web
        void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
      }
    })
  }

  const coordStr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

  return (
    <Pressable
      onPress={openMap}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.container}
    >
      {/* Map-style thumbnail */}
      <View style={styles.mapPreview}>
        {/* Road grid background */}
        <View style={[styles.mapBg, { backgroundColor: isSelf ? '#2a5f8a' : '#d4e6c3' }]} />
        {/* Horizontal road */}
        <View style={[styles.road, styles.roadH, { backgroundColor: isSelf ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)' }]} />
        {/* Vertical road */}
        <View style={[styles.road, styles.roadV, { backgroundColor: isSelf ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)' }]} />
        {/* Block fills */}
        <View style={[styles.block, styles.blockTL, { backgroundColor: isSelf ? 'rgba(255,255,255,0.08)' : 'rgba(180,210,150,0.6)' }]} />
        <View style={[styles.block, styles.blockBR, { backgroundColor: isSelf ? 'rgba(255,255,255,0.08)' : 'rgba(180,210,150,0.6)' }]} />
        {/* Pin */}
        <View style={styles.pinWrap}>
          <View style={[styles.pinHead, { backgroundColor: isSelf ? '#fff' : theme.brand.primary }]}>
            <Ionicons name="location" size={14} color={isSelf ? theme.brand.primary : '#fff'} />
          </View>
          <View style={[styles.pinTail, { borderTopColor: isSelf ? '#fff' : theme.brand.primary }]} />
        </View>
        {/* "Open in Maps" label */}
        <View style={[styles.openBadge, { backgroundColor: isSelf ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }]}>
          <Text style={styles.openBadgeText}>Open in Maps</Text>
        </View>
      </View>
      <View style={[styles.footer, { backgroundColor: isSelf ? 'rgba(255,255,255,0.12)' : theme.bg.elevated }]}>
        <Ionicons name="location-outline" size={14} color={textColor} />
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
            {locationName ?? 'Location'}
          </Text>
          <Text style={[styles.coords, { color: subColor }]}>{coordStr}</Text>
        </View>
        <Ionicons name="chevron-forward" size={12} color={subColor} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { width: 230, borderRadius: 12, overflow: 'hidden' },
  mapPreview: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  mapBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  road: {
    position: 'absolute',
  },
  roadH: {
    left: 0, right: 0,
    top: '45%',
    height: 10,
  },
  roadV: {
    top: 0, bottom: 0,
    left: '42%',
    width: 10,
  },
  block: {
    position: 'absolute',
    borderRadius: 4,
  },
  blockTL: {
    top: 8, left: 8,
    width: '36%',
    height: '32%',
  },
  blockBR: {
    bottom: 8, right: 8,
    width: '40%',
    height: '30%',
  },
  pinWrap: {
    position: 'absolute',
    top: '22%',
    left: '44%',
    alignItems: 'center',
  },
  pinHead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  openBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  textCol: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700' },
  coords: { fontSize: 10, marginTop: 1 },
})
