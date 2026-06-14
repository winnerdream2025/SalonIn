import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { WorkerCard, WorkerCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import type { WorkerCardData } from '@salonin/types'
import { reportsApi, messagesApi } from '@salonin/api-client'
import { getCityLabel } from '@salonin/config'
import { useAuthStore } from '../../store/authStore'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { NotificationBell } from '../../components/NotificationBell'
import { LocationModal } from '../../components/LocationModal'
import { WorkerFilterModal, activeWorkerFilterCount, EMPTY_WORKER_FILTERS } from '../../components/WorkerFilterModal'
import type { WorkerFilters } from '../../components/WorkerFilterModal'

const SPECIALTIES = ['All', 'Available Now', 'Braiders', 'Nail Techs', 'Lash', 'Makeup', 'Barbers']

const SKELETON_COUNT = 6

export default function DiscoveryFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)
  const radiusMiles = useLocationStore((s) => s.radiusMiles)

  const { requestLocation, status } = useDeviceLocation()

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All')
  const [reportTarget, setReportTarget] = useState<WorkerCardData | null>(null)
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [workerFilters, setWorkerFilters] = useState<WorkerFilters>(EMPTY_WORKER_FILTERS)
  const filterCount = activeWorkerFilterCount(workerFilters)
  const currentUser = useAuthStore((s) => s.user)

  const handleMessage = useCallback(async (worker: WorkerCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!currentUser) {
      router.push('/(auth)/login')
      return
    }
    try {
      const conv = await messagesApi.createConversation(worker.id)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(worker.name)}` as never)
    } catch { /* silently fail */ }
  }, [currentUser])

  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, isExpanded, usedRadius, refresh, loadMore } =
    useNearbyWorkers({ specialty: specialtyFilter, radiusMiles })

  const filteredWorkers = useMemo(() => {
    let result = workers
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.specialties.some((s) => s.toLowerCase().includes(q))
      )
    }
    if (workerFilters.availability) {
      result = result.filter((w) => w.availability === workerFilters.availability)
    }
    if (workerFilters.category) {
      result = result.filter((w) =>
        w.specialties.some((s) => s.toLowerCase().includes(workerFilters.category!.toLowerCase()))
      )
    }
    return result
  }, [workers, search, workerFilters])

  const handlePressWorker = useCallback((worker: WorkerCardData) => {
    router.push(`/worker/${worker.id}`)
  }, [])

  const handleToggleSpecialty = useCallback((specialty: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSpecialty((prev) => (prev === specialty ? 'All' : specialty))
  }, [])

  const cityLabel = isGPSLocation ? 'My location' : getCityLabel(cityId)

  const openLocationModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocationModalVisible(true)
  }, [])

  if (!cityId) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.headerSection}>
          <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Discover</Text>
        </View>
        <View style={styles.centerPane}>
          <Text style={[styles.locTitle, { color: theme.text.primary }]}>Where are you?</Text>
          <Text style={[styles.locSubtitle, { color: theme.text.secondary }]}>
            Find talented beauty professionals near you
          </Text>

          {status === 'requesting' ? (
            <View style={styles.gpsLoading}>
              <ActivityIndicator color={theme.brand.primary} />
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>Getting your location…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.gpsBtn, { backgroundColor: theme.brand.primary }]}
              onPress={() => { void requestLocation() }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                <Ionicons name="location" size={16} color="#FFFFFF" />  Use my location
              </Text>
            </TouchableOpacity>
          )}

          {status !== 'requesting' && (
            <>
              <Text style={[styles.orLabel, { color: theme.text.secondary }]}>or</Text>
              <TouchableOpacity
                style={[styles.searchCityBtn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                onPress={() => setLocationModalVisible(true)}
              >
                <Ionicons name="search" size={16} color={theme.text.secondary} />
                <Text style={{ fontSize: 15, color: theme.text.secondary }}>Search a city…</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <LocationModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* ── Compact title bar ── */}
        <View style={[styles.titleBar, { borderBottomColor: theme.border.subtle }]}>
          <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Discover</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={openLocationModal}
              style={[
                styles.locationPill,
                isGPSLocation
                  ? { backgroundColor: 'rgba(29,158,117,0.12)', borderColor: 'rgba(29,158,117,0.3)' }
                  : { backgroundColor: theme.bg.elevated, borderColor: theme.border.default },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={13} color={isGPSLocation ? '#1D9E75' : theme.text.secondary} />
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: isGPSLocation ? '#1D9E75' : theme.text.secondary }}
                numberOfLines={1}
              >
                {cityLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color={isGPSLocation ? '#1D9E75' : theme.text.tertiary} />
            </TouchableOpacity>
            <NotificationBell />
          </View>
        </View>

        {/* ── Search + filter button ── */}
        <View style={[styles.searchRow, { backgroundColor: theme.bg.base }]}>
          <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search workers, specialties..."
              placeholderTextColor={theme.text.tertiary}
              style={[styles.searchInput, { color: theme.text.primary }]}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={[
              styles.filterBtn,
              { backgroundColor: filterCount > 0 ? theme.brand.primary : theme.bg.elevated, borderColor: filterCount > 0 ? theme.brand.primary : theme.border.default },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={18} color={filterCount > 0 ? '#FFFFFF' : theme.text.secondary} />
            {filterCount > 0 && (
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Specialty chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsRow, { backgroundColor: theme.bg.base }]}
        >
          {SPECIALTIES.map((sp) => {
            const active = selectedSpecialty === sp
            return (
              <TouchableOpacity
                key={sp}
                onPress={() => handleToggleSpecialty(sp)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.brand.primary : theme.bg.card,
                    borderColor: active ? theme.brand.primary : theme.border.default,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : theme.text.secondary }}>
                  {sp}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkerCard
              worker={item}
              onPress={() => handlePressWorker(item)}
              onLongPress={() => setReportTarget(item)}
              onMessage={() => void handleMessage(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 56 + bottom + 16 }]}
          ListHeaderComponent={
            isExpanded ? (
              <Text style={[styles.expandedNote, { color: theme.text.tertiary }]}>
                Showing results within {usedRadius} miles
              </Text>
            ) : null
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
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {error.message}
                </Text>
                <Button variant="secondary" onPress={refresh}>Retry</Button>
              </View>
            ) : (
              <View style={styles.centerPane}>
                <Text style={[styles.stateText, { fontSize: 18, fontWeight: '700', color: theme.text.primary }]}>
                  {search.trim().length > 0
                    ? 'No matching professionals'
                    : 'No workers available right now'}
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {search.trim().length > 0
                    ? 'Try a different search term'
                    : 'Be the first to join My Salon In in your area'}
                </Text>
                {search.trim().length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                    onPress={() => {
                      void Share.share({
                        message: 'Join me on My Salon In — the app connecting beauty pros with top salons! https://mysalonin.com',
                      })
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Invite a friend</Text>
                  </TouchableOpacity>
                )}
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

        <WorkerFilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={workerFilters}
          onApply={setWorkerFilters}
        />

        <LocationModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // no-city branch reuses this
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    maxWidth: 140,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipsRow: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
  },
  listContent: { paddingTop: 4 },
  skeletonList: { gap: 8, paddingTop: 8 },
  expandedNote: {
    fontSize: 11,
    textAlign: 'center' as const,
    marginBottom: 6,
    marginTop: 2,
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
  locTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  locSubtitle: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14 },
  stateText: { textAlign: 'center', paddingHorizontal: 32 },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  gpsBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  orLabel: { textAlign: 'center' },
  searchCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
})
