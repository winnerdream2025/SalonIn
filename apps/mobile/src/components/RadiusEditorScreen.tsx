import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  type TextInput as TextInputType,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Circle, Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { useLocationStore, type RadiusMode } from '../store/locationStore'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import type { PlaceResult } from '../hooks/usePlaceSearch'

interface Props {
  visible: boolean
  onClose: () => void
  onApply: (miles: number, mode: RadiusMode) => void
}

export function RadiusEditorScreen({ visible, onClose, onApply }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const location = useLocationStore()

  const [mode, setMode] = useState<RadiusMode>(location.radiusMode)
  const [miles, setMiles] = useState(location.radiusMiles)
  const [searchQuery, setSearchQuery] = useState(location.cityName ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<TextInputType>(null)
  const [mapCenter, setMapCenter] = useState({
    lat: location.lat ?? 38.9072,
    lng: location.lng ?? -77.0369,
  })

  const { results: searchResults, isLoading: isSearching } = usePlaceSearch(showDropdown ? searchQuery : '')

  const initialRegion = useMemo(() => {
    const delta = (location.radiusMiles / 69) * 2.5
    const d = Math.max(0.02, Math.min(delta, 10))
    return { latitude: mapCenter.lat, longitude: mapCenter.lng, latitudeDelta: d, longitudeDelta: d }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount — let MapView own its region after that

  const handleSelectPlace = useCallback(
    (place: PlaceResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      location.setLocation({
        cityId: place.cityId,
        lat: place.lat,
        lng: place.lng,
        cityName: place.shortName,
        countryCode: place.cityRef.countryCode,
        flag: place.cityRef.flag,
      })
      setMapCenter({ lat: place.lat, lng: place.lng })
      setSearchQuery(place.shortName)
      setShowDropdown(false)
    },
    [location],
  )

  const handleBackPress = useCallback(() => {
    if (showDropdown) {
      Keyboard.dismiss()
      setShowDropdown(false)
      return
    }
    onClose()
  }, [showDropdown, onClose])

  const handleApply = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    location.setRadius(miles, mode)
    onApply(miles, mode)
    onClose()
  }, [miles, mode, location, onApply, onClose])

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

        {/* ── Search + dropdown + map (flex area) ── */}
        <View style={styles.mapArea}>
          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.bg.input }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search by city or neighborhood…"
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

          {/* Map — behind dropdown */}
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            onRegionChangeComplete={(r: Region) =>
              setMapCenter({ lat: r.latitude, lng: r.longitude })
            }
            showsUserLocation
            showsMyLocationButton
          >
            <Circle
              center={{ latitude: mapCenter.lat, longitude: mapCenter.lng }}
              radius={miles * 1609.34}
              fillColor="rgba(216,90,48,0.15)"
              strokeColor="#D85A30"
              strokeWidth={2.5}
            />
            <Marker coordinate={{ latitude: mapCenter.lat, longitude: mapCenter.lng }}>
              <View style={styles.markerDot} />
            </Marker>
          </MapView>

          {/* Dropdown overlay */}
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
                    onPress={() => handleSelectPlace(place)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={18} color={theme.text.secondary} />
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
            {/* Suggested */}
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

            {/* Custom */}
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

            {/* Slider + input */}
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
              style={[styles.applyBtn, { marginBottom: Math.max(insets.bottom, 16) }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
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
  dropdownText: {
    fontSize: 15,
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D85A30',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  panel: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  sliderSection: {
    paddingTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  sliderLabel: {
    fontSize: 12,
  },
  milesBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  milesLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milesValue: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 0,
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  applyBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})

