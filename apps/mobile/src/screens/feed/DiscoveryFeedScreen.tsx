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
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { WorkerCard, WorkerCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import type { WorkerCardData } from '@salonin/types'
import { Availability } from '@salonin/types'
import { reportsApi, messagesApi, parseApiError } from '@salonin/api-client'
import { SPECIALTY_CATEGORIES } from '@salonin/config'
import { useAuthStore } from '../../store/authStore'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { NotificationBell } from '../../components/NotificationBell'
import { LocationModal } from '../../components/LocationModal'
import { WorkerFilterModal, activeWorkerFilterCount, EMPTY_WORKER_FILTERS } from '../../components/WorkerFilterModal'
import type { WorkerFilters } from '../../components/WorkerFilterModal'
import { useSuggestedUsers } from '../../hooks/useFollow'
import { followsApi } from '@salonin/api-client'
import type { SuggestedUser } from '@salonin/api-client'

const SPECIALTIES = ['All', ...SPECIALTY_CATEGORIES]

const SKELETON_COUNT = 6

export default function DiscoveryFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)
  const city = useLocationStore((s) => s.city)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)
  const radiusMiles = useLocationStore((s) => s.radiusMiles)
  const hasLocation = lat != null && lng != null

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
    } catch (e: unknown) {
      Alert.alert('Couldn\'t start chat', parseApiError(e))
    }
  }, [currentUser])

  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, isExpanded, usedRadius, refresh, loadMore } =
    useNearbyWorkers({
      specialty: workerFilters.category ?? specialtyFilter,
      availability: workerFilters.availability ? (workerFilters.availability as Availability) : undefined,
      radiusMiles,
    })

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers
    return workers.filter((w) =>
      w.name.toLowerCase().includes(q) ||
      w.specialties.some((s) => s.toLowerCase().includes(q))
    )
  }, [workers, search])

  const handlePressWorker = useCallback((worker: WorkerCardData) => {
    router.push(`/worker/${worker.id}`)
  }, [])

  const handleToggleSpecialty = useCallback((specialty: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSpecialty((prev) => (prev === specialty ? 'All' : specialty))
  }, [])

  // Show real reverse-geocoded name (e.g. "Atlanta, GA") — fall back to generic label
  const cityLabel = city ?? (isGPSLocation ? 'Near you' : 'Set location')

  const openLocationModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocationModalVisible(true)
  }, [])

  if (!hasLocation) {
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
          <View style={styles.titleWrap}>
            <Text style={[styles.serifTitle, { color: theme.text.primary }]} numberOfLines={1}>Discover</Text>
          </View>
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
              <Ionicons name="location-outline" size={13} color={isGPSLocation ? '#1D9E75' : '#D85A30'} />
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: isGPSLocation ? '#1D9E75' : theme.text.secondary, flexShrink: 1 }}
                numberOfLines={1}
              >
                {cityLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color={isGPSLocation ? '#1D9E75' : theme.text.tertiary} />
            </TouchableOpacity>
            <NotificationBell />
          </View>
        </View>

        {/* ── Search (filter icon inside, matching JobFeedScreen) ── */}
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
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ position: 'relative' }}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={filterCount > 0 ? theme.brand.primary : theme.text.tertiary}
              />
              {filterCount > 0 && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Availability toggle + Specialty chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={[styles.chipsRow, { backgroundColor: theme.bg.base }]}
        >
          {/* Availability quick-filter — separate from specialty */}
          {(() => {
            const availActive = workerFilters.availability === 'NOW'
            return (
              <TouchableOpacity
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setWorkerFilters((f) => ({
                    ...f,
                    availability: availActive ? null : 'NOW',
                  }))
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: availActive ? '#1D9E75' : theme.bg.card,
                    borderColor: availActive ? '#1D9E75' : theme.border.default,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: availActive ? '#FFFFFF' : theme.text.secondary }}>
                  Available Now
                </Text>
              </TouchableOpacity>
            )
          })()}
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
            <>
              {currentUser && <SuggestedStylists theme={theme} />}
              {isExpanded ? (
                <Text style={[styles.expandedNote, { color: theme.text.tertiary }]}>
                  Showing results within {usedRadius} miles
                </Text>
              ) : null}
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
                <View style={[styles.emptyIcon, { backgroundColor: 'rgba(226,75,74,0.10)' }]}>
                  <Ionicons name="cloud-offline-outline" size={28} color="#E24B4A" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                  Couldn't load professionals
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {error.message.toLowerCase().includes('network')
                    ? 'Check your connection and try again.'
                    : 'Something went wrong on our end.'}
                </Text>
                <Button variant="secondary" onPress={refresh}>Try again</Button>
              </View>
            ) : (
              <View style={styles.centerPane}>
                <View style={[styles.emptyIcon, { backgroundColor: 'rgba(29,158,117,0.10)' }]}>
                  <Ionicons
                    name={search.trim().length > 0 ? 'search-outline' : 'people-outline'}
                    size={28}
                    color="#1D9E75"
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                  {search.trim().length > 0
                    ? 'No matching professionals'
                    : `No pros in ${cityLabel} yet`}
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {search.trim().length > 0
                    ? 'Try different keywords or adjust your filters'
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
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Invite a pro</Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleWrap: {
    flex: 1,            // fills all space left after headerRight takes its natural size
    minWidth: 0,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,    // right controls never compress — pill text shrinks instead
    marginLeft: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 160,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchWrap: {
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
  filterDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D85A30',
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsRow: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  stateText: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14, lineHeight: 20 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 },
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

// ─── Suggested Stylists ───────────────────────────────────────────────────────

function SuggestedStylists({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const { suggestions, isLoading } = useSuggestedUsers()
  const [followed, setFollowed] = React.useState<Set<string>>(new Set())

  if (isLoading || suggestions.length === 0) return null

  const handleFollow = async (userId: string) => {
    setFollowed((prev) => new Set([...prev, userId]))
    await followsApi.follow(userId).catch(() => {
      setFollowed((prev) => { const next = new Set(prev); next.delete(userId); return next })
    })
  }

  return (
    <View style={suggestStyles.section}>
      <View style={suggestStyles.header}>
        <Text style={[suggestStyles.title, { color: theme.text.primary }]}>Suggested Stylists</Text>
        <TouchableOpacity onPress={() => router.push('/search' as never)}>
          <Text style={[suggestStyles.seeAll, { color: '#D85A30' }]}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={suggestStyles.list}>
        {suggestions.map((s) => (
          <SuggestedCard key={s.id} user={s} theme={theme} isFollowed={followed.has(s.id)} onFollow={handleFollow} />
        ))}
      </ScrollView>
    </View>
  )
}

function SuggestedCard({
  user,
  theme,
  isFollowed,
  onFollow,
}: {
  user: SuggestedUser
  theme: ReturnType<typeof useTheme>['theme']
  isFollowed: boolean
  onFollow: (id: string) => void
}) {
  return (
    <TouchableOpacity
      style={[suggestStyles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
      onPress={() => router.push(`/worker/${user.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={[suggestStyles.avatar, { backgroundColor: theme.bg.elevated }]}>
        {user.photoUrl ? (
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          <View style={suggestStyles.avatarImg}>
            <Text style={{ fontSize: 22 }}>{user.name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 22, color: theme.text.secondary }}>{user.name[0]?.toUpperCase() ?? '?'}</Text>
        )}
      </View>
      <Text style={[suggestStyles.name, { color: theme.text.primary }]} numberOfLines={1}>{user.name}</Text>
      {user.specialties[0] && (
        <Text style={[suggestStyles.specialty, { color: theme.text.secondary }]} numberOfLines={1}>{user.specialties[0]}</Text>
      )}
      {user.reason === 'mutual' && (
        <Text style={[suggestStyles.reason, { color: '#D85A30' }]}>Mutual follow</Text>
      )}
      {user.rating > 0 && (
        <Text style={[suggestStyles.reason, { color: theme.text.tertiary }]}>⭐ {user.rating.toFixed(1)}</Text>
      )}
      <TouchableOpacity
        onPress={() => onFollow(user.id)}
        disabled={isFollowed}
        style={[suggestStyles.followBtn, isFollowed ? { backgroundColor: theme.bg.elevated, borderColor: theme.border.default } : { backgroundColor: '#D85A30', borderColor: '#D85A30' }]}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: isFollowed ? theme.text.secondary : '#fff' }}>
          {isFollowed ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const suggestStyles = StyleSheet.create({
  section: { paddingTop: 8, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { width: 120, borderRadius: 16, borderWidth: 0.5, padding: 12, alignItems: 'center', gap: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarImg: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  specialty: { fontSize: 11, textAlign: 'center' },
  reason: { fontSize: 10, textAlign: 'center' },
  followBtn: { marginTop: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5 },
})
