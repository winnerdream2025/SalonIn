import React, { useState, useCallback, useMemo } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { WorkerCard, WorkerCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import type { WorkerCardData } from '@salonin/types'
import { reportsApi, messagesApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { NotificationBell } from '../../components/NotificationBell'
import { WorkerFilterModal, activeWorkerFilterCount, EMPTY_WORKER_FILTERS } from '../../components/WorkerFilterModal'
import type { WorkerFilters } from '../../components/WorkerFilterModal'

const SPECIALTIES = ['All', 'Available Now', 'Braiders', 'Nail Techs', 'Lash', 'Makeup', 'Barbers']

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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalSheet, { backgroundColor: theme.bg.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.border.default }]} />

          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
              Change Location
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, color: theme.brand.primary, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => void handleGPS()}
            disabled={status === 'requesting'}
            style={[styles.gpsRow, { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.3)' }]}
            activeOpacity={0.8}
          >
            {status === 'requesting' ? (
              <ActivityIndicator color="#1D9E75" size="small" />
            ) : (
              <Ionicons name="location" size={20} color="#1D9E75" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1D9E75' }}>Use my location</Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 1 }}>
                {status === 'requesting' ? 'Getting your location…' : 'Auto-detect via GPS'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#1D9E75" />
          </TouchableOpacity>

          <View style={[styles.searchWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
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
                <Ionicons name="close" size={16} color={theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

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
                  <Ionicons name="business" size={18} color={theme.text.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{city.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
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
  const { bottom, top } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)

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
    useNearbyWorkers({ specialty: specialtyFilter })

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

  const cityLabel = isGPSLocation
    ? 'My location'
    : CITY_PRESETS.find((c) => c.cityId === cityId)?.short ?? cityId?.toUpperCase() ?? ''

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
            Use GPS or choose your city to find talent nearby
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

          {status === 'denied' && (
            <Text style={[styles.deniedText, { color: theme.text.secondary }]}>
              Location access denied. Please select your city below.
            </Text>
          )}

          {status !== 'requesting' && (
            <>
              <Text style={[styles.orLabel, { color: theme.text.secondary }]}>or</Text>
              <View style={styles.cityList}>
                {CITY_PRESETS.map((city) => (
                  <TouchableOpacity
                    key={city.cityId}
                    style={[styles.cityPill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                    onPress={() => setLocation(city.cityId, city.lat, city.lng)}
                  >
                    <Text style={{ fontSize: 15, color: theme.text.primary }}>{city.label}</Text>
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
                <Ionicons name={isGPSLocation ? 'location' : 'business'} size={14} color={isGPSLocation ? '#1D9E75' : theme.text.secondary} />
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
              <View style={[styles.expandedBanner, { backgroundColor: 'rgba(216,90,48,0.08)', borderColor: 'rgba(216,90,48,0.25)' }]}>
                <Text style={{ fontSize: 13, color: theme.brand.primary, textAlign: 'center' }}>
                  No workers found nearby. Showing results within {usedRadius} miles.
                </Text>
              </View>
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
                    : 'Be the first to join Salonin in your area'}
                </Text>
                {search.trim().length === 0 && (
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
  locTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  locSubtitle: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14 },
  cityList: { gap: 12, width: '100%', paddingHorizontal: 32 },
  cityPill: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  stateText: { textAlign: 'center', paddingHorizontal: 32 },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  gpsBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
