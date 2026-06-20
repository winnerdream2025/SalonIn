import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import MapView, { PROVIDER_DEFAULT, Marker, type Region } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { usePlaceSearch, type PlaceResult } from '../../hooks/usePlaceSearch'
import { fetchPlaceDetails, formatPlaceLabel } from '../../utils/googlePlaces'

/** A confirmed, job-specific location chosen by the poster. */
export interface JobLocation {
  lat: number
  lng: number
  city: string | null
  state: string | null
  country: string | null
  placeId: string | null
  formattedAddress: string | null
}

interface Props {
  value: JobLocation | null
  onChange: (loc: JobLocation) => void
}

/**
 * Dedicated location step for posting a listing.
 *
 * The poster searches for the exact job address, sees a map pin preview, and
 * the selected place becomes the confirmed location for the post — independent
 * of the user's global discovery location.
 */
export function JobLocationStep({ value, onChange }: Props) {
  const { theme } = useTheme()
  const mapRef = useRef<MapView>(null)

  const [query, setQuery] = useState(value?.formattedAddress ?? value?.city ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const { results, isLoading } = usePlaceSearch(showDropdown ? query : '')

  const handleSelect = useCallback(
    async (place: PlaceResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSelectingId(place.id)
      try {
        const details = await fetchPlaceDetails(place.id)
        if (!details) return
        const loc: JobLocation = {
          lat: details.lat,
          lng: details.lng,
          city: details.city || place.shortName,
          state: details.state ?? null,
          country: details.country ?? null,
          placeId: details.placeId ?? null,
          formattedAddress: details.formattedAddress ?? null,
        }
        onChange(loc)
        setQuery(details.formattedAddress || formatPlaceLabel(details))
        setShowDropdown(false)
        Keyboard.dismiss()
        const region: Region = {
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
        mapRef.current?.animateToRegion(region, 500)
      } finally {
        setSelectingId(null)
      }
    },
    [onChange],
  )

  const confirmed = value != null

  return (
    <View style={styles.container}>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
        Where is this located?
      </Text>
      <Text style={[styles.hint, { color: theme.text.secondary }]}>
        Search for the exact address. Workers see this distance when deciding to apply, so set it accurately.
      </Text>

      {/* ── Search ── */}
      <View style={[styles.searchBar, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
        <Ionicons name="search" size={18} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search address or city…"
          placeholderTextColor={theme.text.tertiary}
          value={query}
          onChangeText={(t) => {
            setQuery(t)
            setShowDropdown(t.trim().length >= 2)
          }}
          onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true) }}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => { setQuery(''); setShowDropdown(false) }} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Dropdown ── */}
      {showDropdown && (results.length > 0 || isLoading) && (
        <View style={[styles.dropdown, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          {isLoading && results.length === 0 ? (
            <View style={styles.dropdownRow}>
              <ActivityIndicator size="small" color="#D85A30" />
              <Text style={[styles.dropdownText, { color: theme.text.tertiary }]}>Searching…</Text>
            </View>
          ) : (
            results.map((place, idx) => (
              <TouchableOpacity
                key={place.id}
                style={[
                  styles.dropdownRow,
                  { borderBottomColor: theme.border.subtle },
                  idx === results.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => void handleSelect(place)}
                activeOpacity={0.7}
                disabled={selectingId !== null}
              >
                {selectingId === place.id ? (
                  <ActivityIndicator size="small" color="#D85A30" />
                ) : (
                  <Ionicons name="location-outline" size={18} color="#D85A30" />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.dropdownText, { color: theme.text.primary }]} numberOfLines={1}>
                    {place.shortName}
                  </Text>
                  {!!place.secondaryText && (
                    <Text style={[styles.dropdownSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                      {place.secondaryText}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* ── Map preview ── */}
      {confirmed ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: value.lat,
              longitude: value.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
            pointerEvents="none"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} pinColor="#D85A30" />
          </MapView>
        </View>
      ) : (
        <View style={[styles.mapPlaceholder, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
          <Ionicons name="map-outline" size={28} color={theme.text.tertiary} />
          <Text style={[styles.placeholderText, { color: theme.text.tertiary }]}>
            Search above to set the location
          </Text>
        </View>
      )}

      {/* ── Confirmed pill ── */}
      {confirmed && (
        <View style={[styles.confirmRow, { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: '#1D9E75' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#1D9E75" />
          <Text style={[styles.confirmText, { color: theme.text.primary }]} numberOfLines={2}>
            {value.formattedAddress ?? [value.city, value.state, value.country].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  stepTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  hint: { fontSize: 13, lineHeight: 18 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  dropdown: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -6,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: 15 },
  dropdownSub: { fontSize: 12, marginTop: 1 },
  mapWrap: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 13 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmText: { flex: 1, fontSize: 13, fontWeight: '600' },
})
