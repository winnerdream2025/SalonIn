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
  const mapBg = isSelf ? 'rgba(255,255,255,0.15)' : theme.bg.elevated

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
      {/* Static map preview area */}
      <View style={[styles.mapPreview, { backgroundColor: mapBg }]}>
        <Ionicons name="map-outline" size={28} color={isSelf ? 'rgba(255,255,255,0.6)' : theme.text.secondary} />
        <View style={styles.pinOverlay}>
          <Ionicons name="location" size={28} color={isSelf ? '#fff' : theme.brand.primary} />
        </View>
      </View>
      <View style={styles.footer}>
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
  container: { width: 220, borderRadius: 10, overflow: 'hidden' },
  mapPreview: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textCol: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700' },
  coords: { fontSize: 10, marginTop: 1 },
})
