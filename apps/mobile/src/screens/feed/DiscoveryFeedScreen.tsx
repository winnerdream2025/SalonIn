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
  const { bottom, top } = useSafeAreaInsets()
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

  const SearchAndFilters = (
    <View style={{ gap: 12 }}>
      <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
        <Ionicons name="search" size={20} color={theme.text.tertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search workers, specialties..."
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary }]}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ position: 'relative' }}
        >
          <Ionicons name="options-outline" size={20} color={filterCount > 0 ? theme.brand.primary : theme.text.tertiary} />
          {filterCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.brand.primary,
            }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {SPECIALTIES.map((sp) => {
          const active = selectedSpecialty === sp
          return (
            <TouchableOpacity
              key={sp}
              onPress={() => handleToggleSpecialty(sp)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? theme.brand.primary : theme.bg.card,
                  borderColor: active ? theme.brand.primary : theme.border.default,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? '#FFFFFF' : theme.text.secondary,
                }}
              >
                {sp}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )

  if (!cityId) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.headerSection}>
          <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Workers</Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Find talented professionals ✨
          </Text>
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
        <View style={[styles.headerSection, { paddingTop: top > 0 ? 8 : 16 }]}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Workers</Text>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                Find talented professionals ✨
              </Text>
            </View>
            <View style={styles.headerRight}>
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
                <Ionicons name="location-outline" size={14} color={isGPSLocation ? '#1D9E75' : theme.text.secondary} />
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: isGPSLocation ? '#1D9E75' : theme.text.secondary }}
                  numberOfLines={1}
                >
                  {cityLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color={isGPSLocation ? '#1D9E75' : theme.text.tertiary} />
              </TouchableOpacity>
              <NotificationBell />
            </View>
          </View>

          {SearchAndFilters}
        </View>

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
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
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
