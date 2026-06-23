import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import { fetchPlaceDetails, reverseGeocodeWithGoogle } from '../utils/googlePlaces'
import type { PlaceResult } from '../hooks/usePlaceSearch'

export interface PickedLocation {
  latitude: number
  longitude: number
  locationName?: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSend: (loc: PickedLocation) => void
}

export function ChatLocationPicker({ visible, onClose, onSend }: Props) {
  const { theme } = useTheme()

  const [region, setRegion] = useState({
    latitude: 38.9072,
    longitude: -77.0369,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })
  const [locationName, setLocationName] = useState('')
  const [isLoadingGPS, setIsLoadingGPS] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const mapRef = useRef<MapView>(null)

  const { results, isLoading: isSearching } = usePlaceSearch(showSearch ? search : '')

  // Acquire GPS when picker opens
  useEffect(() => {
    if (!visible) return
    setIsLoadingGPS(true)
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const { latitude, longitude } = pos.coords
        const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
        setRegion(newRegion)
        setTimeout(() => mapRef.current?.animateToRegion(newRegion, 500), 300)
        const place = await reverseGeocodeWithGoogle(latitude, longitude)
        if (place) setLocationName(place.formattedAddress ?? place.city)
      } catch {
        // keep default region
      } finally {
        setIsLoadingGPS(false)
      }
    })()
  }, [visible])

  const handleSelectPlace = useCallback(async (place: PlaceResult) => {
    setSelectingId(place.id)
    Keyboard.dismiss()
    try {
      const details = await fetchPlaceDetails(place.id)
      if (!details) return
      const newRegion = {
        latitude: details.lat,
        longitude: details.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
      setRegion(newRegion)
      setLocationName(details.formattedAddress ?? details.city)
      setTimeout(() => mapRef.current?.animateToRegion(newRegion, 500), 100)
      setShowSearch(false)
      setSearch('')
    } finally {
      setSelectingId(null)
    }
  }, [])

  const handleSend = useCallback(() => {
    onSend({
      latitude: region.latitude,
      longitude: region.longitude,
      locationName: locationName || undefined,
    })
    setSearch('')
    setShowSearch(false)
  }, [region, locationName, onSend])

  const handleClose = useCallback(() => {
    setSearch('')
    setShowSearch(false)
    onClose()
  }, [onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: theme.bg.surface }]} edges={['bottom']}>
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text.primary }]}>Share Location</Text>
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="search" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Search overlay ── */}
          {showSearch && (
            <View style={[styles.searchOverlay, { backgroundColor: theme.bg.surface }]}>
              <View style={[styles.searchBar, { backgroundColor: theme.bg.input }]}>
                <TouchableOpacity onPress={() => { setShowSearch(false); setSearch('') }}>
                  <Ionicons name="arrow-back" size={20} color={theme.text.secondary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.searchInput, { color: theme.text.primary }]}
                  placeholder="Search for a place or address…"
                  placeholderTextColor={theme.text.tertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={results}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.placeRow, { borderBottomColor: theme.border.subtle }]}
                    onPress={() => void handleSelectPlace(item)}
                    disabled={selectingId !== null}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.placeIcon, { backgroundColor: theme.bg.elevated }]}>
                      {selectingId === item.id ? (
                        <ActivityIndicator size="small" color="#D85A30" />
                      ) : (
                        <Ionicons name="location" size={16} color="#D85A30" />
                      )}
                    </View>
                    <View style={styles.placeText}>
                      <Text style={[styles.placeName, { color: theme.text.primary }]} numberOfLines={1}>
                        {item.shortName}
                      </Text>
                      {item.secondaryText.length > 0 && (
                        <Text style={[styles.placeSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  isSearching ? (
                    <View style={styles.emptyWrap}>
                      <ActivityIndicator color="#D85A30" />
                      <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Searching…</Text>
                    </View>
                  ) : search.trim().length >= 2 ? (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="location-outline" size={32} color={theme.text.tertiary} />
                      <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                        No results for "{search}"
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="search-outline" size={32} color={theme.text.tertiary} />
                      <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                        Type a place name or address
                      </Text>
                    </View>
                  )
                }
              />
            </View>
          )}

          {/* ── Live map ── */}
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              region={region}
              scrollEnabled
              zoomEnabled
              onRegionChangeComplete={(r) => setRegion(r)}
            >
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
                <View style={styles.markerOuter}>
                  <View style={styles.markerInner} />
                </View>
              </Marker>
            </MapView>
            {isLoadingGPS && (
              <View style={styles.mapLoadingOverlay}>
                <View style={[styles.mapLoadingPill, { backgroundColor: theme.bg.surface }]}>
                  <ActivityIndicator size="small" color="#D85A30" />
                  <Text style={[styles.mapLoadingText, { color: theme.text.primary }]}>Finding location…</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Footer: location name + Send ── */}
          <View style={[styles.footer, { borderTopColor: theme.border.default, backgroundColor: theme.bg.surface }]}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={18} color="#D85A30" />
              <Text style={[styles.locationLabel, { color: theme.text.primary }]} numberOfLines={2}>
                {locationName || `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 8,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // ── Search overlay ──────────────────────────────────────────────────────────
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeSub: {
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Map ─────────────────────────────────────────────────────────────────────
  mapWrap: {
    height: 280,
  },
  map: {
    flex: 1,
  },
  markerOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(216,90,48,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D85A30',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapLoadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#D85A30',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 11,
    minWidth: 90,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
