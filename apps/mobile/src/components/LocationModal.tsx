import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { searchCities } from '@salonin/config'
import type { WorldCity } from '@salonin/config'
import { useLocationStore } from '../store/locationStore'
import { useDeviceLocation } from '../hooks/useDeviceLocation'

interface Props {
  visible: boolean
  onClose: () => void
}

export function LocationModal({ visible, onClose }: Props) {
  const { theme } = useTheme()
  const { requestLocation, status } = useDeviceLocation()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const [search, setSearch] = useState('')
  const inputRef = useRef<TextInput>(null)

  const results = searchCities(search)

  const handleSelect = useCallback(
    (city: WorldCity) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setLocation({
        cityId: city.id,
        lat: city.lat,
        lng: city.lng,
        cityName: city.name,
        countryCode: city.countryCode,
        flag: city.flag,
      })
      setSearch('')
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
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text.primary }]}>Change location</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Search bar */}
          <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search city or country…"
              placeholderTextColor={theme.text.tertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* GPS row */}
          <TouchableOpacity
            style={[styles.gpsRow, { borderBottomColor: theme.border.subtle }]}
            onPress={() => void handleUseGPS()}
            activeOpacity={0.7}
          >
            {status === 'requesting' ? (
              <ActivityIndicator size="small" color={theme.brand.primary} />
            ) : (
              <Ionicons name="navigate" size={20} color={theme.brand.primary} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.gpsLabel, { color: theme.brand.primary }]}>
                Use my current location
              </Text>
              <Text style={[styles.gpsSub, { color: theme.text.tertiary }]}>
                Auto-detect nearest city
              </Text>
            </View>
          </TouchableOpacity>

          {/* City list */}
          <FlatList
            data={results}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = cityId === item.id
              return (
                <TouchableOpacity
                  style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cityName, { color: theme.text.primary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.citySub, { color: theme.text.tertiary }]}>
                      {item.state ? `${item.state}, ` : ''}{item.country}
                    </Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={theme.brand.primary} />
                  )}
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={
              search.trim().length > 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                    No cities found for "{search}"
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
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  gpsLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  gpsSub: {
    fontSize: 12,
    marginTop: 1,
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
