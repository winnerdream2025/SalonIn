import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  type TextInput as TextInputType,
  type LayoutChangeEvent,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { PROVIDER_DEFAULT, type Region } from 'react-native-maps'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { useLocationStore, type RadiusMode } from '../store/locationStore'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import type { PlaceResult } from '../hooks/usePlaceSearch'
import {
  fetchPlaceDetails,
  reverseGeocodeWithGoogle,
  formatPlaceLabel,
  type ResolvedPlace,
} from '../utils/googlePlaces'
import { countryCodeToFlag } from '../utils/countryFlag'

interface Props {
  visible: boolean
  onClose: () => void
  onApply: (miles: number, mode: RadiusMode) => void
}

export function RadiusEditorScreen({ visible, onClose, onApply }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const location = useLocationStore()
  const mapRef = useRef<MapView>(null)

  const [mode, setMode] = useState<RadiusMode>(location.radiusMode)
  const [miles, setMiles] = useState(location.radiusMiles)
  const [searchQuery, setSearchQuery] = useState(location.city ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  // Live label for the current map center (reverse-geocoded as the user pans).
  const [centerLabel, setCenterLabel] = useState(location.city ?? 'Selected area')
  const [isResolvingLabel, setIsResolvingLabel] = useState(false)
  // Pending coords to reverse-geocode (debounced) after a user pan.
  const [geocodeTarget, setGeocodeTarget] = useState<{ lat: number; lng: number } | null>(null)
  // Most recent reverse-geocoded place for the current center — applied on Apply.
  const resolvedPlaceRef = useRef<ResolvedPlace | null>(null)
  const searchRef = useRef<TextInputType>(null)
  const [mapContainerHeight, setMapContainerHeight] = useState(300)
  const [currentLatDelta, setCurrentLatDelta] = useState(() => {
    const delta = (location.radiusMiles / 69) * 2.5
    return Math.max(0.02, Math.min(delta, 10))
  })

  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [currentCenter, setCurrentCenter] = useState({
    latitude: location.lat ?? 38.9072,
    longitude: location.lng ?? -77.0369,
  })
  // Tracks whether the next onRegionChangeComplete is from code (not user gesture)
  const isProgrammaticPanRef = useRef(false)
  const isFirstRegionChangeRef = useRef(true)

  const { results: searchResults, isLoading: isSearching } = usePlaceSearch(showDropdown ? searchQuery : '')

  const initialRegion = useMemo(() => {
    const d = currentLatDelta
    return {
      latitude: location.lat ?? 38.9072,
      longitude: location.lng ?? -77.0369,
      latitudeDelta: d,
      longitudeDelta: d,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount — MapView owns its region after that

  // Pixel radius: miles * (mapPixels / latDelta_miles)
  const pixelRadius = useMemo(() => {
    if (!mapContainerHeight || !currentLatDelta) return 0
    return (miles * mapContainerHeight) / (currentLatDelta * 69)
  }, [miles, mapContainerHeight, currentLatDelta])

  const handleMapLayout = useCallback((e: LayoutChangeEvent) => {
    setMapContainerHeight(e.nativeEvent.layout.height)
  }, [])

  const handleSelectPlace = useCallback(
    async (place: PlaceResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectingId(place.id)
      try {
        const details = await fetchPlaceDetails(place.id)
        if (!details) return
        resolvedPlaceRef.current = details
        location.setLocation({
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
        isProgrammaticPanRef.current = true
        mapRef.current?.animateToRegion({
          latitude: details.lat,
          longitude: details.lng,
          latitudeDelta: currentLatDelta,
          longitudeDelta: currentLatDelta,
        }, 600)
        setCurrentCenter({ latitude: details.lat, longitude: details.lng })
        setSearchQuery(details.city || place.shortName)
        setCenterLabel(formatPlaceLabel(details))
        setShowDropdown(false)
        Keyboard.dismiss()
      } finally {
        setSelectingId(null)
      }
    },
    [location, currentLatDelta],
  )

  const handleBackPress = useCallback(() => {
    if (showDropdown) {
      Keyboard.dismiss()
      setShowDropdown(false)
      return
    }
    onClose()
  }, [showDropdown, onClose])

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setCurrentLatDelta(r.latitudeDelta)
    setCurrentCenter({ latitude: r.latitude, longitude: r.longitude })

    // Skip the very first fire (initial map render) and programmatic pans
    if (isFirstRegionChangeRef.current) {
      isFirstRegionChangeRef.current = false
      return
    }
    if (isProgrammaticPanRef.current) {
      isProgrammaticPanRef.current = false
      return
    }

    // User manually panned — show a loading label and queue reverse geocoding.
    // Never snap to a static "nearest city".
    resolvedPlaceRef.current = null
    setIsResolvingLabel(true)
    setCenterLabel('Loading location…')
    setGeocodeTarget({ lat: r.latitude, lng: r.longitude })
  }, [])

  // Debounced reverse geocoding for the current map center.
  useEffect(() => {
    if (!geocodeTarget) return
    const timer = setTimeout(async () => {
      const place = await reverseGeocodeWithGoogle(geocodeTarget.lat, geocodeTarget.lng)
      if (place) {
        resolvedPlaceRef.current = { ...place, lat: geocodeTarget.lat, lng: geocodeTarget.lng }
        setCenterLabel(formatPlaceLabel(place))
        setSearchQuery(place.city)
      } else {
        resolvedPlaceRef.current = null
        setCenterLabel('Selected area')
      }
      setIsResolvingLabel(false)
    }, 550)
    return () => clearTimeout(timer)
  }, [geocodeTarget])

  const handleApply = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // If the map center moved from the stored location, resolve the new address
    // and persist it so feeds re-query with the correct coordinates.
    const storeLat = location.lat ?? 38.9072
    const storeLng = location.lng ?? -77.0369
    const movedLat = Math.abs(currentCenter.latitude - storeLat)
    const movedLng = Math.abs(currentCenter.longitude - storeLng)
    const didMove = movedLat > 0.0001 || movedLng > 0.0001

    if (didMove) {
      setIsApplying(true)
      try {
        const { latitude: lat, longitude: lng } = currentCenter
        // Prefer the place already resolved while panning; otherwise resolve now.
        const place =
          resolvedPlaceRef.current ?? (await reverseGeocodeWithGoogle(lat, lng))

        if (place) {
          location.setLocation({
            placeId: place.placeId,
            lat,
            lng,
            city: place.city,
            state: place.state,
            country: place.country,
            countryCode: place.countryCode,
            flag: place.countryCode ? countryCodeToFlag(place.countryCode) : undefined,
            formattedAddress: place.formattedAddress,
          })
        } else {
          // Geocoding failed — persist coords with a neutral label, never a wrong city.
          location.setLocation({
            lat,
            lng,
            city: 'Selected area',
            country: '',
            formattedAddress: 'Selected area',
          })
        }
      } finally {
        setIsApplying(false)
      }
    }

    location.setRadius(miles, mode)
    onApply(miles, mode)
  }, [currentCenter, miles, mode, location, onApply])

  const handleModeChange = useCallback((newMode: RadiusMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMode(newMode)
    if (newMode === 'suggested') setMiles(15)
  }, [])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={handleBackPress}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.base }]} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Location</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ── Map area (flex 1) ── */}
        <View style={styles.mapArea} onLayout={handleMapLayout}>
          {/* Map — freely pannable/zoomable */}
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
            pitchEnabled={false}
            showsMyLocationButton={false}
          />

          {/* Fixed circle ring — map moves under this */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {/* Ring centered by flex */}
            <View style={styles.ringContainer}>
              {pixelRadius > 8 && (
                <View style={[
                  styles.circleRing,
                  { width: pixelRadius * 2, height: pixelRadius * 2, borderRadius: pixelRadius },
                ]} />
              )}
            </View>
            {/* Center dot absolutely over center */}
            <View style={styles.dotContainer}>
              <View style={styles.centerDot} />
            </View>
          </View>

          {/* Live center label — reflects exact reverse-geocoded location */}
          <View style={styles.centerLabelWrap} pointerEvents="none">
            <View style={[styles.centerLabelPill, { backgroundColor: theme.bg.surface }]}>
              {isResolvingLabel ? (
                <ActivityIndicator size="small" color="#D85A30" />
              ) : (
                <Ionicons name="location" size={14} color="#D85A30" />
              )}
              <Text
                style={[styles.centerLabelText, { color: theme.text.primary }]}
                numberOfLines={1}
              >
                {centerLabel}
              </Text>
            </View>
          </View>

          {/* Search bar — floats above map */}
          <View style={[styles.searchBar, { backgroundColor: theme.bg.surface }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search city…"
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t)
                setShowDropdown(t.trim().length >= 2)
              }}
              onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true) }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              onSubmitEditing={() => setShowDropdown(false)}
            />
            {searchQuery.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setShowDropdown(false) }}>
                <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown results */}
          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <View style={[styles.dropdown, { backgroundColor: theme.bg.surface, shadowColor: theme.text.primary }]}>
              {isSearching && searchResults.length === 0 ? (
                <View style={styles.dropdownRow}>
                  <Ionicons name="search" size={18} color={theme.text.tertiary} />
                  <Text style={[styles.dropdownText, { color: theme.text.tertiary }]}>Searching…</Text>
                </View>
              ) : (
                searchResults.map((place, idx) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[
                      styles.dropdownRow,
                      { borderBottomColor: theme.border.subtle },
                      idx === searchResults.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => void handleSelectPlace(place)}
                    activeOpacity={0.7}
                    disabled={selectingId !== null}
                  >
                    {selectingId === place.id ? (
                      <ActivityIndicator size="small" color="#D85A30" />
                    ) : (
                      <Ionicons name="location-outline" size={18} color="#D85A30" />
                    )}
                    <Text style={[styles.dropdownText, { color: theme.text.primary }]}>{place.shortName}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* ── Options panel ── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.panel, { backgroundColor: theme.bg.base }]}>
            {/* Suggested radius option */}
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomColor: theme.border.subtle }]}
              onPress={() => handleModeChange('suggested')}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: theme.text.primary }]}>Suggested radius</Text>
                <Text style={[styles.optionSub, { color: theme.text.secondary }]}>
                  Show me listings from this general area.
                </Text>
              </View>
              <View style={[
                styles.radio,
                {
                  borderColor: mode === 'suggested' ? '#D85A30' : theme.border.default,
                  backgroundColor: mode === 'suggested' ? '#D85A30' : 'transparent',
                },
              ]}>
                {mode === 'suggested' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Custom radius option */}
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomColor: mode === 'custom' ? theme.border.subtle : 'transparent' }]}
              onPress={() => handleModeChange('custom')}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: theme.text.primary }]}>Custom radius</Text>
                <Text style={[styles.optionSub, { color: theme.text.secondary }]}>
                  Only show me listings within a specific distance.
                </Text>
              </View>
              <View style={[
                styles.radio,
                {
                  borderColor: mode === 'custom' ? '#D85A30' : theme.border.default,
                  backgroundColor: mode === 'custom' ? '#D85A30' : 'transparent',
                },
              ]}>
                {mode === 'custom' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Slider + miles input */}
            {mode === 'custom' && (
              <View style={styles.sliderSection}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  value={miles}
                  onValueChange={(v) => setMiles(Math.round(v))}
                  minimumTrackTintColor="#D85A30"
                  maximumTrackTintColor={theme.border.default}
                  thumbTintColor="#D85A30"
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: theme.text.tertiary }]}>1</Text>
                  <Text style={[styles.sliderLabel, { color: theme.text.tertiary }]}>100</Text>
                </View>
                <View style={[styles.milesBox, { borderColor: theme.border.default, backgroundColor: theme.bg.input }]}>
                  <Text style={[styles.milesLabel, { color: theme.text.tertiary }]}>Miles</Text>
                  <TextInput
                    style={[styles.milesValue, { color: theme.text.primary }]}
                    value={String(miles)}
                    onChangeText={(t) => {
                      const n = parseInt(t, 10)
                      if (!isNaN(n)) setMiles(Math.min(100, Math.max(1, n)))
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
            )}

            <Text style={[styles.note, { color: theme.text.tertiary }]}>
              Changes to custom radius apply to the Local tab only.
            </Text>

            <TouchableOpacity
              style={[styles.applyBtn, { marginBottom: Math.max(insets.bottom, 16), opacity: isApplying ? 0.7 : 1 }]}
              onPress={() => { void handleApply() }}
              activeOpacity={0.85}
              disabled={isApplying}
            >
              {isApplying
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.applyBtnText}>Apply</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
  },
  // Fixed ring overlay — children centered by flex
  ringContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleRing: {
    borderWidth: 2.5,
    borderColor: '#D85A30',
    backgroundColor: 'rgba(216,90,48,0.10)',
  },
  dotContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D85A30',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 4,
  },
  // Search bar floats above map
  searchBar: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  centerLabelWrap: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  centerLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  centerLabelText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  dropdown: {
    position: 'absolute',
    top: 66,
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: 15 },
  panel: { paddingHorizontal: 16, paddingTop: 6 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionSub: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  sliderSection: { paddingTop: 8 },
  slider: { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  sliderLabel: { fontSize: 12 },
  milesBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  milesLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  milesValue: { fontSize: 22, fontWeight: '700', paddingVertical: 0, marginTop: 2 },
  note: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  applyBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  applyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})

