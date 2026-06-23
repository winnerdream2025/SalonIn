import React, { forwardRef } from 'react'
import { Platform, View, Text, StyleSheet } from 'react-native'
import MapView, { type MapViewProps } from 'react-native-maps'
import { ErrorBoundary } from './ErrorBoundary'

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const MapUnavailable = () => (
  <View style={styles.unavailable}>
    <Text style={styles.icon}>🗺️</Text>
    <Text style={styles.label}>Map unavailable</Text>
    <Text style={styles.sub}>Configure GOOGLE_MAPS_API_KEY to enable maps</Text>
  </View>
)

const SafeMapViewInner = forwardRef<MapView, MapViewProps>((props, ref) => {
  if (Platform.OS === 'android' && !MAPS_KEY) {
    return <MapUnavailable />
  }
  return <MapView ref={ref} {...props} />
})

SafeMapViewInner.displayName = 'SafeMapViewInner'

export const SafeMapView = forwardRef<MapView, MapViewProps>((props, ref) => (
  <ErrorBoundary fallback={<MapUnavailable />}>
    <SafeMapViewInner ref={ref} {...props} />
  </ErrorBoundary>
))

SafeMapView.displayName = 'SafeMapView'

export { MapUnavailable }

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    gap: 8,
  },
  icon: { fontSize: 40 },
  label: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  sub: { color: '#666666', fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
})
