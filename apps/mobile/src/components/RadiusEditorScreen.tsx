import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { searchCities } from '@salonin/config'
import type { WorldCity } from '@salonin/config'
import { useLocationStore, type RadiusMode } from '../store/locationStore'

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
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => searchCities(searchQuery), [searchQuery])

  const lat = location.lat ?? 38.9072
  const lng = location.lng ?? -77.0369

  const mapDelta = useMemo(() => {
    const delta = (miles / 69) * 2.5
    return Math.max(0.02, Math.min(delta, 10))
  }, [miles])

  const handleSelectCity = useCallback(
    (city: WorldCity) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      location.setLocation({
        cityId: city.id,
        lat: city.lat,
        lng: city.lng,
        cityName: city.name,
        countryCode: city.countryCode,
        flag: city.flag,
      })
      setShowSearch(false)
      setSearchQuery('')
    },
    [location],
  )

  const handleApply = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onApply(miles, mode)
    onClose()
  }, [miles, mode, onApply, onClose])

  const handleModeChange = useCallback((newMode: RadiusMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMode(newMode)
    if (newMode === 'suggested') {
      setMiles(15)
    }
  }, [])

  const handleSliderChange = useCallback((value: number) => {
    setMiles(Math.round(value))
  }, [])

  const handleMilesInput = useCallback((text: string) => {
    const n = parseInt(text, 10) || 1
    setMiles(Math.min(100, Math.max(1, n)))
  }, [])

  if (showSearch) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.base }]}>
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                setShowSearch(false)
                setSearchQuery('')
              }}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Search location</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.searchBar, { backgroundColor: theme.bg.input }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search by city, neighborhood or ZIP code"
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                onPress={() => handleSelectCity(item)}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cityName, { color: theme.text.primary }]}>{item.name}</Text>
                  <Text style={[styles.citySub, { color: theme.text.tertiary }]}>
                    {item.state ? `${item.state}, ` : ''}
                    {item.country}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.base }]} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Location</Text>
            <View style={{ width: 24 }} />
          </View>

          <Pressable
            style={[styles.searchBar, { backgroundColor: theme.bg.input }]}
            onPress={() => setShowSearch(true)}
          >
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <Text style={[styles.searchPlaceholder, { color: theme.text.tertiary }]}>
              Search by city, neighborhood or ZIP code
            </Text>
          </Pressable>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              region={{
                latitude: lat,
                longitude: lng,
                latitudeDelta: mapDelta,
                longitudeDelta: mapDelta,
              }}
              showsUserLocation
              showsMyLocationButton={false}
            >
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={miles * 1609.34}
                fillColor="rgba(216,90,48,0.15)"
                strokeColor="#D85A30"
                strokeWidth={2}
              />
              <Marker coordinate={{ latitude: lat, longitude: lng }}>
                <View style={styles.markerDot} />
              </Marker>
            </MapView>
          </View>

          <View style={styles.optionsContainer}>
            <Pressable
              style={[styles.optionRow, { borderBottomColor: theme.border.subtle }]}
              onPress={() => handleModeChange('suggested')}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: theme.text.primary }]}>
                  Suggested radius
                </Text>
                <Text style={[styles.optionSub, { color: theme.text.secondary }]}>
                  Show me listings from this general area.
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: mode === 'suggested' ? '#D85A30' : theme.border.default,
                    backgroundColor: mode === 'suggested' ? '#D85A30' : 'transparent',
                  },
                ]}
              >
                {mode === 'suggested' && <View style={styles.radioInner} />}
              </View>
            </Pressable>

            <Pressable
              style={[styles.optionRow, { borderBottomColor: theme.border.subtle }]}
              onPress={() => handleModeChange('custom')}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: theme.text.primary }]}>
                  Custom radius
                </Text>
                <Text style={[styles.optionSub, { color: theme.text.secondary }]}>
                  Only show me listings within a specific distance.
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: mode === 'custom' ? '#D85A30' : theme.border.default,
                    backgroundColor: mode === 'custom' ? '#D85A30' : 'transparent',
                  },
                ]}
              >
                {mode === 'custom' && <View style={styles.radioInner} />}
              </View>
            </Pressable>

            {mode === 'custom' && (
              <View style={styles.sliderSection}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={100}
                  value={miles}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor="#D85A30"
                  maximumTrackTintColor={theme.border.default}
                  thumbTintColor="#D85A30"
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: theme.text.tertiary }]}>1</Text>
                  <Text style={[styles.sliderLabel, { color: theme.text.tertiary }]}>100</Text>
                </View>

                <View style={[styles.milesInputWrap, { backgroundColor: theme.bg.input, borderColor: theme.border.default }]}>
                  <Text style={[styles.milesLabel, { color: theme.text.tertiary }]}>Miles</Text>
                  <TextInput
                    style={[styles.milesInput, { color: theme.text.primary }]}
                    value={String(miles)}
                    onChangeText={handleMilesInput}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
            )}
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchPlaceholder: {
    fontSize: 15,
  },
  mapContainer: {
    height: 240,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D85A30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  optionsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 13,
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
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  sliderSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
  },
  milesInputWrap: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  milesLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milesInput: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    paddingVertical: 0,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  applyBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
})
