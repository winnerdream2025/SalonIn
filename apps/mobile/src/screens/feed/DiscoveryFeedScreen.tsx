import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { WorkerCard, WorkerCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import type { WorkerCardData } from '@salonin/types'
import { reportsApi } from '@salonin/api-client'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'

const SPECIALTIES = ['Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave']

const CITY_PRESETS = [
  { cityId: 'dmv', label: 'Washington DC / DMV', lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
]

const SKELETON_COUNT = 6

export default function DiscoveryFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)
  const clearLocation = useLocationStore((s) => s.clearLocation)

  const { requestLocation, status } = useDeviceLocation()

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()
  const [reportTarget, setReportTarget] = useState<WorkerCardData | null>(null)

  const { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore } =
    useNearbyWorkers({ specialty: selectedSpecialty })

  const handlePressWorker = useCallback((worker: WorkerCardData) => {
    router.push(`/worker/${worker.id}`)
  }, [])

  const handleToggleSpecialty = useCallback((specialty: string) => {
    setSelectedSpecialty((prev) => (prev === specialty ? undefined : specialty))
  }, [])

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
              <Text variant="body" style={styles.gpsBtnText}>📍  Use my location</Text>
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
        {isGPSLocation ? (
          <TouchableOpacity style={styles.gpsPill} onPress={clearLocation}>
            <Text variant="caption" style={styles.gpsPillText}>📍 Using your location</Text>
          </TouchableOpacity>
        ) : (
          <Text variant="caption" color="secondary">{cityId.toUpperCase()}</Text>
        )}
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
        ListHeaderComponent={SpecialtyFilters}
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
              <Text variant="body" color="secondary" style={styles.stateText}>
                No workers found nearby.
              </Text>
              <Text variant="caption" color="secondary">
                Try expanding your search radius or clearing filters.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.brand.primary} />
            </View>
          ) : hasMore && workers.length > 0 ? (
            <View style={styles.footer}>
              <Button variant="ghost" onPress={loadMore}>
                Load more
              </Button>
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
  gpsBtnText: { color: '#FFFFFF', fontWeight: '600' as const },
  deniedText: { textAlign: 'center', paddingHorizontal: 32 },
  orLabel: { textAlign: 'center' },
  gpsPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
    backgroundColor: 'rgba(29,158,117,0.15)',
    borderWidth: 1, borderColor: 'rgba(29,158,117,0.25)',
  },
  gpsPillText: { color: '#2DD4A0' },
})
