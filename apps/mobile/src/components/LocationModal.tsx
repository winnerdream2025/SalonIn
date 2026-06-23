import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { SafeMapView as MapView } from './SafeMapView'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { useLocationStore } from '../store/locationStore'
import { useDeviceLocation } from '../hooks/useDeviceLocation'
import { RadiusEditorScreen } from './RadiusEditorScreen'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import type { PlaceResult } from '../hooks/usePlaceSearch'
import { fetchPlaceDetails } from '../utils/googlePlaces'
import { countryCodeToFlag } from '../utils/countryFlag'

interface Props {
  visible: boolean
  onClose: () => void
}

export function LocationModal({ visible, onClose }: Props) {
  const { theme } = useTheme()
  const { requestLocation, status } = useDeviceLocation()
  const location = useLocationStore()
  const setLocation = useLocationStore((s) => s.setLocation)
  const setRadius = useLocationStore((s) => s.setRadius)

  const [showSearch, setShowSearch] = useState(false)
  const [showRadiusEditor, setShowRadiusEditor] = useState(false)
  const [search, setSearch] = useState('')
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const lat = location.lat ?? 38.9072
  const lng = location.lng ?? -77.0369
  const cityName = location.city ?? 'Washington DC'

  const { results: searchResults, isLoading: isSearching } = usePlaceSearch(showSearch ? search : '')

  const mapDelta = useMemo(() => {
    const delta = (location.radiusMiles / 69) * 2.5
    return Math.max(0.02, Math.min(delta, 10))
  }, [location.radiusMiles])

  const handleSelect = useCallback(
    async (place: PlaceResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectingId(place.id)
      try {
        // Google Places Details is the source of truth — exact city/state/country/coords.
        const details = await fetchPlaceDetails(place.id)
        if (!details) return

        setLocation({
          placeId: details.placeId,
          lat: details.lat,
          lng: details.lng,
          city: details.city || place.shortName,
          state: details.state,
          country: details.country,
          countryCode: details.countryCode,
          flag: details.countryCode ? countryCodeToFlag(details.countryCode) : undefined,
          formattedAddress: details.formattedAddress,
        })
        setSearch('')
        setShowSearch(false)
        onClose()
      } finally {
        setSelectingId(null)
      }
    },
    [setLocation, onClose],
  )

  const handleUseGPS = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const granted = await requestLocation()
    if (granted) {
      setSearch('')
      onClose()
    }
  }, [requestLocation, onClose])

  const handleClose = useCallback(() => {
    setSearch('')
    setShowSearch(false)
    onClose()
  }, [onClose])

  const handleApplyRadius = useCallback(
    (miles: number, mode: 'suggested' | 'custom') => {
      setRadius(miles, mode)
      setShowRadiusEditor(false)
      onClose()
    },
    [setRadius, onClose],
  )

  // Single Modal — swap content via state, never nest two Modals (avoids iOS pageSheet white gap)
  return (
    <>
      {showRadiusEditor && (
        <RadiusEditorScreen
          visible={visible}
          onClose={() => setShowRadiusEditor(false)}
          onApply={handleApplyRadius}
        />
      )}

      <Modal
        visible={visible && !showRadiusEditor}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => {
          if (showSearch) {
            setShowSearch(false)
            setSearch('')
          } else {
            handleClose()
          }
        }}
      >
        <View
          style={[
            styles.overlay,
            Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.55)' },
          ]}
        >
          {showSearch ? (
            /* ── Search view ── */
            <SafeAreaView
              style={[styles.sheet, styles.fullSheet, { backgroundColor: theme.bg.surface }]}
              edges={['bottom']}
            >
              <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => { setShowSearch(false); setSearch('') }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text.primary }]}>Search location</Text>
                <View style={{ width: 22 }} />
              </View>

              <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
                <Ionicons name="search" size={18} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text.primary }]}
                  placeholder="Search city or country…"
                  placeholderTextColor={theme.text.tertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {search.length > 0 && Platform.OS === 'android' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={searchResults}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, backgroundColor: theme.bg.surface }}
                renderItem={({ item }) => {
                  const isSelecting = selectingId === item.id
                  return (
                    <TouchableOpacity
                      style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                      onPress={() => void handleSelect(item)}
                      activeOpacity={0.7}
                      disabled={selectingId !== null}
                    >
                      <View style={[styles.cityIconWrap, { backgroundColor: theme.bg.elevated }]}>
                        {isSelecting ? (
                          <ActivityIndicator size="small" color="#D85A30" />
                        ) : (
                          <Ionicons name="location" size={16} color="#D85A30" />
                        )}
                      </View>
                      <View style={styles.cityTextBlock}>
                        <Text style={[styles.cityName, { color: theme.text.primary }]} numberOfLines={1}>
                          {item.shortName}
                        </Text>
                        {item.secondaryText.length > 0 && (
                          <Text style={[styles.citySub, { color: theme.text.tertiary }]} numberOfLines={1}>
                            {item.secondaryText}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                    </TouchableOpacity>
                  )
                }}
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
                      <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Search a city</Text>
                      <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                        Type a city or country name to find locations
                      </Text>
                    </View>
                  )
                }
              />
            </SafeAreaView>
          ) : (
            /* ── Main location view ── */
            <SafeAreaView
              style={[styles.sheet, { backgroundColor: theme.bg.surface }]}
              edges={['bottom']}
            >
              <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text.primary }]}>Choose a location</Text>
                <Pressable
                  onPress={() => setShowSearch(true)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="search" size={22} color={theme.text.primary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Pressable style={styles.mapContainer} onPress={() => setShowRadiusEditor(true)}>
                  <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    region={{
                      latitude: lat,
                      longitude: lng,
                      latitudeDelta: mapDelta,
                      longitudeDelta: mapDelta,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    pointerEvents="none"
                  >
                    <Circle
                      center={{ latitude: lat, longitude: lng }}
                      radius={location.radiusMiles * 1609.34}
                      fillColor="rgba(216,90,48,0.15)"
                      strokeColor="#D85A30"
                      strokeWidth={2}
                    />
                    <Marker coordinate={{ latitude: lat, longitude: lng }}>
                      <View style={styles.markerDot} />
                    </Marker>
                  </MapView>
                  <View style={styles.mapEditHint}>
                    <Ionicons name="pencil" size={13} color="#fff" />
                    <Text style={styles.mapEditHintText}>Tap to adjust radius</Text>
                  </View>
                </Pressable>

                <View style={styles.locationInfo}>
                  <View style={styles.locationNameRow}>
                    {location.flag != null && (
                      <Text style={styles.locationFlag}>{location.flag}</Text>
                    )}
                    <Text style={[styles.locationName, { color: theme.text.primary }]} numberOfLines={1}>
                      {cityName}
                    </Text>
                    {location.isGPSLocation && (
                      <View style={[styles.gpsBadge, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
                        <Ionicons name="navigate" size={10} color="#1D9E75" />
                        <Text style={styles.gpsBadgeText}>GPS</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.radiusLabel, { color: theme.text.secondary }]}>
                    {location.radiusMode === 'suggested'
                      ? 'Suggested radius'
                      : `${location.radiusMiles} mi radius`}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.locateBtn, { backgroundColor: '#D85A30', flex: 1 }]}
                    onPress={() => void handleUseGPS()}
                    activeOpacity={0.8}
                  >
                    {status === 'requesting' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="navigate" size={16} color="#FFFFFF" />
                        <Text style={styles.locateBtnText}>Use my location</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.locateBtn, { borderWidth: 1.5, borderColor: '#D85A30', flex: 1 }]}
                    onPress={() => setShowSearch(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={16} color="#D85A30" />
                    <Text style={[styles.locateBtnText, { color: '#D85A30' }]}>Search a city</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </>
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
    maxHeight: '90%',
    paddingTop: 8,
  },
  fullSheet: {
    flex: 1,
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
    paddingBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  mapContainer: {
    height: 180,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapEditHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapEditHintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D85A30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  locationInfo: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 3,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  radiusLabel: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  locateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
  locateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cityTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  citySub: {
    fontSize: 12,
    marginTop: 1,
  },
  // Location info section
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  locationFlag: {
    fontSize: 18,
    lineHeight: 22,
    flexShrink: 0,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D9E75',
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
