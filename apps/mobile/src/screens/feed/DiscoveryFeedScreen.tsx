import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { WorkerCard, WorkerCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import type { WorkerCardData } from '@salonin/types'
import { reportsApi } from '@salonin/api-client'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'

const SPECIALTIES = ['Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave']

const CITY_PRESETS = [
  { cityId: 'dmv',     label: 'Washington DC / DMV', short: 'DC / DMV',    lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA',          short: 'Atlanta, GA', lat: 33.749,  lng: -84.388  },
  { cityId: 'houston', label: 'Houston, TX',          short: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { cityId: 'miami',   label: 'Miami, FL',            short: 'Miami, FL',   lat: 25.7617, lng: -80.1918 },
]

const SKELETON_COUNT = 6

function LocationModal({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const { requestLocation, status } = useDeviceLocation()
  const setLocation = useLocationStore((s) => s.setLocation)
  const [query, setQuery] = useState('')

  const filtered = query.trim().length > 0
    ? CITY_PRESETS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : CITY_PRESETS

  const handleSelectCity = useCallback((city: typeof CITY_PRESETS[0]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLocation(city.cityId, city.lat, city.lng)
    setQuery('')
    onClose()
  }, [setLocation, onClose])

  const handleGPS = useCallback(async () => {
    await requestLocation()
    onClose()
  }, [requestLocation, onClose])

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalSheet, { backgroundColor: theme.bg.surface }]}>
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: theme.border.default }]} />

          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
              Change Location
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, color: '#D85A30', fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* GPS option */}
          <TouchableOpacity
            onPress={() => void handleGPS()}
            disabled={status === 'requesting'}
            style={[styles.gpsRow, { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.3)' }]}
            activeOpacity={0.8}
          >
            {status === 'requesting' ? (
              <ActivityIndicator color="#1D9E75" size="small" />
            ) : (
              <Text style={{ fontSize: 20 }}>📍</Text>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1D9E75' }}>Use my location</Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 1 }}>
                {status === 'requesting' ? 'Getting your location…' : 'Auto-detect via GPS'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#1D9E75' }}>›</Text>
          </TouchableOpacity>

          {/* Search input */}
          <View style={[styles.searchWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
            <Text style={{ fontSize: 15, color: theme.text.tertiary }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city or area…"
              placeholderTextColor={theme.text.tertiary}
              style={{ flex: 1, fontSize: 15, color: theme.text.primary, paddingVertical: 0 }}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: theme.text.tertiary }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* City list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: bottom + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 32 }}>
                <Text style={{ fontSize: 14, color: theme.text.tertiary }}>No cities found</Text>
              </View>
            ) : (
              filtered.map((city) => (
                <TouchableOpacity
                  key={city.cityId}
                  onPress={() => handleSelectCity(city)}
                  style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18 }}>🏙️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{city.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: theme.text.tertiary }}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function DiscoveryFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)

  const { requestLocation, status } = useDeviceLocation()

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()
  const [reportTarget, setReportTarget] = useState<WorkerCardData | null>(null)
  const [locationModalVisible, setLocationModalVisible] = useState(false)

  const { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, isExpanded, usedRadius, refresh, loadMore } =
    useNearbyWorkers({ specialty: selectedSpecialty })

  const handlePressWorker = useCallback((worker: WorkerCardData) => {
    router.push(`/worker/${worker.id}`)
  }, [])

  const handleToggleSpecialty = useCallback((specialty: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSpecialty((prev) => (prev === specialty ? undefined : specialty))
  }, [])

  const cityLabel = isGPSLocation
    ? 'My location'
    : CITY_PRESETS.find((c) => c.cityId === cityId)?.short ?? cityId?.toUpperCase() ?? ''

  const SpecialtyFilters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScroll}
    >
      {SPECIALTIES.map((s) => {
        const active = selectedSpecialty === s
        return (
          <TouchableOpacity
            key={s}
            onPress={() => handleToggleSpecialty(s)}
            style={[
              styles.filterPill,
              {
                backgroundColor: active ? theme.brand.primary : theme.bg.elevated,
                borderColor: active ? theme.brand.primary : theme.border.default,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: active ? '#FFFFFF' : theme.text.secondary }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  if (!cityId) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.header}>
          <Text variant="title">Discover</Text>
        </View>
        <View style={styles.centerPane}>
          <Text variant="heading" style={styles.locTitle}>Where are you?</Text>
          <Text variant="body" color="secondary" style={styles.locSubtitle}>
            Use GPS or choose your city to find talent nearby
          </Text>

          {status === 'requesting' ? (
            <View style={styles.gpsLoading}>
              <ActivityIndicator color={theme.brand.primary} />
              <Text variant="caption" color="secondary">Getting your location…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.gpsBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => { void requestLocation() }}
            >
              <Text variant="body" style={[styles.gpsBtnText, { color: theme.text.inverse }]}>📍  Use my location</Text>
            </TouchableOpacity>
          )}

          {status === 'denied' && (
            <Text variant="caption" color="secondary" style={styles.deniedText}>
              Location access denied. Please select your city below.
            </Text>
          )}

          {status !== 'requesting' && (
            <>
              <Text variant="caption" color="secondary" style={styles.orLabel}>or</Text>
              <View style={styles.cityList}>
                {CITY_PRESETS.map((city) => (
                  <TouchableOpacity
                    key={city.cityId}
                    style={[styles.cityPill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                    onPress={() => setLocation(city.cityId, city.lat, city.lng)}
                  >
                    <Text variant="body">{city.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text variant="title">Discover</Text>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setLocationModalVisible(true)
          }}
          style={[
            styles.locationPill,
            isGPSLocation
              ? { backgroundColor: 'rgba(29,158,117,0.12)', borderColor: 'rgba(29,158,117,0.3)' }
              : { backgroundColor: theme.bg.elevated, borderColor: theme.border.default },
          ]}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12 }}>{isGPSLocation ? '📍' : '🏙️'}</Text>
          <Text
            style={{ fontSize: 12, fontWeight: '600', color: isGPSLocation ? '#1D9E75' : theme.text.secondary }}
            numberOfLines={1}
          >
            {cityLabel}
          </Text>
          <Text style={{ fontSize: 10, color: isGPSLocation ? '#1D9E75' : theme.text.tertiary }}>▾</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onPress={() => handlePressWorker(item)}
            onLongPress={() => setReportTarget(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 56 + bottom + 16 }]}
        ListHeaderComponent={
          <>
            {SpecialtyFilters}
            {isExpanded && (
              <View style={[styles.expandedBanner, { backgroundColor: 'rgba(216,90,48,0.08)', borderColor: 'rgba(216,90,48,0.25)' }]}>
                <Text style={{ fontSize: 13, color: '#D85A30', textAlign: 'center' }}>
                  No workers found nearby. Showing results within {usedRadius} miles.
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <WorkerCardSkeleton key={i} />
              ))}
            </View>
          ) : error != null ? (
            <View style={styles.centerPane}>
              <Text variant="body" color="secondary" style={styles.stateText}>
                {error.message}
              </Text>
              <Button variant="secondary" onPress={refresh}>
                Retry
              </Button>
            </View>
          ) : (
            <View style={styles.centerPane}>
              <Text variant="heading" style={[styles.stateText, { fontSize: 18, fontWeight: '700' }]}>
                No workers available right now
              </Text>
              <Text variant="caption" color="secondary" style={styles.stateText}>
                Be the first to join Salonin in your area
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                onPress={() => {
                  void Share.share({
                    message: 'Join me on Salonin — the app connecting beauty pros with top salons! https://salonin.app',
                  })
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Invite a friend</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, color: theme.text.tertiary, textDecorationLine: 'underline' }}>
                  Change location
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.brand.primary} />
            </View>
          ) : null
        }
        refreshing={isRefreshing}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <ReportModal
        isVisible={reportTarget !== null}
        reportedName={reportTarget?.name ?? ''}
        onClose={() => setReportTarget(null)}
        onSubmit={async (type, reason) => {
          if (!reportTarget) return
          await reportsApi.createReport(reportTarget.id, type, reason)
          setReportTarget(null)
        }}
      />

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    maxWidth: 160,
  },
  filterScroll: { maxHeight: 52 },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  listContent: { paddingHorizontal: 16 },
  separator: { height: 8 },
  skeletonList: { gap: 8, paddingTop: 8 },
  expandedBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyCtaBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center' as const,
    width: '100%',
  },
  footer: { paddingVertical: 16, alignItems: 'center' },
  centerPane: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 12 },
  locTitle: { textAlign: 'center' },
  locSubtitle: { textAlign: 'center', paddingHorizontal: 32 },
  cityList: { gap: 12, width: '100%', paddingHorizontal: 32 },
  cityPill: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  stateText: { textAlign: 'center' },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  gpsBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  gpsBtnText: { fontWeight: '600' as const },
  deniedText: { textAlign: 'center', paddingHorizontal: 32 },
  orLabel: { textAlign: 'center' },
  modalSheet: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
