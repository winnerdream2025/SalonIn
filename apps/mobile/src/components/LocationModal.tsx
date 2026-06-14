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
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { getNearbyCities } from '@salonin/config'
import { useLocationStore } from '../store/locationStore'
import { useDeviceLocation } from '../hooks/useDeviceLocation'
import { RadiusEditorScreen } from './RadiusEditorScreen'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import type { PlaceResult } from '../hooks/usePlaceSearch'

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

  const lat = location.lat ?? 38.9072
  const lng = location.lng ?? -77.0369
  const cityName = location.cityName ?? 'Washington DC'

  const { results: searchResults, isLoading: isSearching } = usePlaceSearch(showSearch ? search : '')
  const suggestedCities = useMemo(() => getNearbyCities(lat, lng, 4), [lat, lng])

  const mapDelta = useMemo(() => {
    const delta = (location.radiusMiles / 69) * 2.5
    return Math.max(0.02, Math.min(delta, 10))
  }, [location.radiusMiles])

  const handleSelect = useCallback(
    (place: PlaceResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setLocation({
        cityId: place.cityId,
        lat: place.lat,
        lng: place.lng,
        cityName: place.shortName,
        countryCode: place.cityRef.countryCode,
        flag: place.cityRef.flag,
      })
      setSearch('')
      setShowSearch(false)
      onClose()
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

  if (showRadiusEditor) {
    return (
      <RadiusEditorScreen
        visible={visible}
        onClose={() => setShowRadiusEditor(false)}
        onApply={handleApplyRadius}
      />
    )
  }

  if (showSearch) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={() => {
          setShowSearch(false)
          setSearch('')
        }}
      >
        <View
          style={[
            styles.overlay,
            Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.55)' },
          ]}
        >
          <SafeAreaView
            style={[styles.sheet, styles.fullSheet, { backgroundColor: theme.bg.surface }]}
            edges={['bottom']}
          >
            <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false)
                  setSearch('')
                }}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{item.cityRef.flag}</Text>
                  <Text style={[styles.cityName, { color: theme.text.primary }]}>
                    {item.shortName}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                isSearching ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Searching…</Text>
                  </View>
                ) : search.trim().length >= 2 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                      No results for "{search}"
                    </Text>
                  </View>
                ) : null
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.overlay,
          Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.55)' },
        ]}
      >
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
              <Text style={[styles.locationName, { color: theme.text.primary }]}>{cityName}</Text>
              <Text style={[styles.radiusLabel, { color: theme.text.secondary }]}>
                {location.radiusMode === 'suggested'
                  ? 'Suggested radius'
                  : `${location.radiusMiles} mile radius`}
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
            </View>

            <View style={styles.suggestedSection}>
              <Text style={[styles.suggestedHeader, { color: theme.text.secondary }]}>
                Suggested for you
              </Text>
              {suggestedCities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.suggestedRow, { borderBottomColor: theme.border.subtle }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    setLocation({
                      cityId: city.id,
                      lat: city.lat,
                      lng: city.lng,
                      cityName: city.name,
                      countryCode: city.countryCode,
                      flag: city.flag,
                    })
                    onClose()
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search-outline" size={18} color={theme.text.tertiary} />
                  <Text style={[styles.suggestedText, { color: theme.text.primary }]}>
                    {city.name}, {city.state ?? city.country}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
    maxHeight: '90%',
    paddingTop: 8,
  },
  fullSheet: {
    maxHeight: '95%',
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
  },
  locationName: {
    fontSize: 17,
    fontWeight: '700',
  },
  radiusLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  suggestedSection: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  suggestedHeader: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestedText: {
    fontSize: 15,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 26,
    lineHeight: 30,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  citySub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
})
