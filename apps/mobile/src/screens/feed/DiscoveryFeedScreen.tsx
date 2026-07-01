import React, { useState, useCallback, useMemo, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  View,
  FlatList,
  Image,
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
import { WorkerCard, WorkerCardSkeleton, SalonCard, SalonCardSkeleton, Text, Button, useTheme, ReportModal } from '@salonin/ui'
import { useStories, type UserStoryState } from '../../contexts/StoriesContext'
import type { Theme } from '@salonin/ui'
import type { WorkerCardData, SalonCardData } from '@salonin/types'
import { Availability } from '@salonin/types'
import { reportsApi, messagesApi, workersApi, parseApiError } from '@salonin/api-client'
import type { SuggestedUser } from '@salonin/api-client'
import { ALL_SPECIALTIES, specialtyLabel, SPECIALTY_CATEGORIES } from '@salonin/config'
import { useAuthStore } from '../../store/authStore'
import { useAuthGateStore } from '../../store/authGateStore'
import { useAuthGate } from '../../hooks/useAuthGate'
import { useNearbyWorkers } from '../../hooks/useNearbyWorkers'
import { useNearbySalons } from '../../hooks/useNearbySalons'
import { useLocationStore } from '../../store/locationStore'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { NotificationBell } from '../../components/NotificationBell'
import { useSuggestedUsers } from '../../hooks/useFollow'
import { LocationModal } from '../../components/LocationModal'
import { WorkerFilterModal, activeWorkerFilterCount, EMPTY_WORKER_FILTERS } from '../../components/WorkerFilterModal'
import type { WorkerFilters } from '../../components/WorkerFilterModal'
import { RadiusPickerSheet } from '../../components/RadiusPickerSheet'

const CATEGORY_EMOJIS: Record<string, string> = {
  hair: '💇🏽‍♀️',
  nails: '💅🏽',
  lashes: '👁️',
  makeup: '💄',
  barber: '✂️',
  skincare: '🧴',
}

const SKELETON_COUNT = 6

interface WorkerCardRowProps {
  worker: WorkerCardData
  storyMap: Map<string, UserStoryState>
  onPressWorker: (worker: WorkerCardData) => void
  onLongPressWorker: (worker: WorkerCardData) => void
  onMessageWorker: (worker: WorkerCardData) => void
  onStoryPress: (userId: string) => void
}

function WorkerCardRow({
  worker,
  storyMap,
  onPressWorker,
  onLongPressWorker,
  onMessageWorker,
  onStoryPress,
}: WorkerCardRowProps) {
  const uid = worker.userId
  const ss = uid ? storyMap.get(uid) : undefined
  const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
  return (
    <WorkerCard
      worker={worker}
      onPress={() => onPressWorker(worker)}
      onLongPress={() => onLongPressWorker(worker)}
      onMessage={() => onMessageWorker(worker)}
      storyState={storyState}
      onStoryPress={uid && ss?.hasStory ? () => onStoryPress(uid) : undefined}
    />
  )
}

export default function DiscoveryFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)
  const city = useLocationStore((s) => s.city)
  const isGPSLocation = useLocationStore((s) => s.isGPSLocation)
  const radiusMiles = useLocationStore((s) => s.radiusMiles)
  const radiusMode = useLocationStore((s) => s.radiusMode)
  const hasLocation = lat != null && lng != null

  const { requestLocation, status } = useDeviceLocation()

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All')
  const [reportTarget, setReportTarget] = useState<WorkerCardData | null>(null)
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const afterLocationSetRef = useRef(false)
  const [search, setSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showRadiusPicker, setShowRadiusPicker] = useState(false)
  const [workerFilters, setWorkerFilters] = useState<WorkerFilters>(EMPTY_WORKER_FILTERS)
  const [activeDiscoverTab, setActiveDiscoverTab] = useState<'All' | 'Saved'>('All')
  const [discoverMode, setDiscoverMode] = useState<'workers' | 'salons'>('workers')
  const [savedWorkerIds, setSavedWorkerIds] = useState<Set<string>>(new Set())
  const filterCount = activeWorkerFilterCount(workerFilters)
  const currentUser = useAuthStore((s) => s.user)
  const isSalonUser = currentUser?.role === 'SALON'
  const isClientUser = currentUser?.accountType === 'CLIENT'
  const { storyMap, openViewerForUser } = useStories()

  React.useEffect(() => {
    if (!currentUser) return
    workersApi.getSavedWorkerIds()
      .then((ids: string[]) => setSavedWorkerIds(new Set(ids)))
      .catch(() => {})
  }, [currentUser])

  // Auto-request GPS for new CLIENT users who haven't set a location yet
  React.useEffect(() => {
    const isClient = currentUser?.accountType === 'CLIENT'
    if (isClient && !hasLocation && status === 'idle') {
      void requestLocation()
    }
  // Only run once on mount — intentional empty-ish deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showGate = useAuthGateStore((s) => s.show)

  const handleMessage = useCallback(async (worker: WorkerCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!currentUser) {
      showGate('/(tabs)', 'Sign in to message this professional')
      return
    }
    try {
      const conv = await messagesApi.createConversation(worker.userId ?? worker.id)
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: conv.id,
          name: worker.name,
          otherUserId: worker.userId ?? '',
          otherPhotoUrl: worker.photoUrl ?? '',
        },
      } as never)
    } catch (e: unknown) {
      Alert.alert('Couldn\'t start chat', parseApiError(e))
    }
  }, [currentUser, showGate])

  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { workers, isLoading, isRefreshing, isLoadingMore, hasMore, error, isExpanded, usedRadius, refresh, loadMore } =
    useNearbyWorkers({
      specialty: workerFilters.specialty ?? specialtyFilter,
      availability: workerFilters.availability ? (workerFilters.availability as Availability) : undefined,
      radiusMiles,
    })

  const filteredWorkers = useMemo(() => {
    let result = workers
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.specialties.some((s) => s.toLowerCase().includes(q))
      )
    }
    if (activeDiscoverTab === 'Saved') {
      result = result.filter((w) => savedWorkerIds.has(w.id))
    }
    // Bookable filter — client-side until API supports the param
    if (workerFilters.bookable) {
      result = result.filter((w) => w.acceptsBookings === true)
    }
    // Freelance filter — client-side: FREELANCE employment type indicates freelance
    if (workerFilters.freelance) {
      result = result.filter((w) => w.homeServiceEnabled === true || w.travelServiceEnabled === true)
    }
    return result
  }, [workers, search, activeDiscoverTab, savedWorkerIds, workerFilters.bookable, workerFilters.freelance])

  const handlePressWorker = useCallback((worker: WorkerCardData) => {
    router.push(`/worker/${worker.id}`)
  }, [])

  const handleLongPressWorker = useCallback((worker: WorkerCardData) => {
    setReportTarget(worker)
  }, [])

  const handleStoryPress = useCallback((userId: string) => {
    openViewerForUser(userId)
  }, [openViewerForUser])

  // ── Salons discovery (only fetches while the Salons tab is active) ──
  const {
    salons,
    isLoading: salonsLoading,
    isRefreshing: salonsRefreshing,
    isLoadingMore: salonsLoadingMore,
    hasMore: salonsHasMore,
    error: salonsError,
    refresh: refreshSalons,
    loadMore: loadMoreSalons,
  } = useNearbySalons({
    specialty: specialtyFilter,
    radiusMiles,
    enabled: discoverMode === 'salons',
  })

  const filteredSalons = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return salons
    return salons.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.specialties.some((sp) => sp.toLowerCase().includes(q))
    )
  }, [salons, search])

  const handlePressSalon = useCallback((salon: SalonCardData) => {
    router.push(`/salon/${salon.id}`)
  }, [])

  const renderSalonItem = useCallback(
    ({ item }: { item: SalonCardData }) => {
      const uid = item.userId
      const ss = uid ? storyMap.get(uid) : undefined
      const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
      return (
        <SalonCard
          salon={item}
          onPress={() => handlePressSalon(item)}
          storyState={storyState}
          onStoryPress={uid && ss?.hasStory ? () => handleStoryPress(uid) : undefined}
        />
      )
    },
    [storyMap, handlePressSalon, handleStoryPress],
  )

  const handleToggleSpecialty = useCallback((specialty: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSpecialty((prev) => (prev === specialty ? 'All' : specialty))
  }, [])

  // Show real reverse-geocoded name (e.g. "Atlanta, GA") — fall back to generic label
  const cityLabel = city || (isGPSLocation ? 'Near you' : 'Set location')

  const openLocationModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocationModalVisible(true)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: WorkerCardData }) => (
      <WorkerCardRow
        worker={item}
        storyMap={storyMap}
        onPressWorker={handlePressWorker}
        onLongPressWorker={handleLongPressWorker}
        onMessageWorker={handleMessage}
        onStoryPress={handleStoryPress}
      />
    ),
    [storyMap, handlePressWorker, handleLongPressWorker, handleMessage, handleStoryPress],
  )

  const listHeader = useMemo(
    () => (
      <>
        {/* ── Page header (scrolls with list, like Jobs) ── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.serifTitle, { color: theme.text.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {isSalonUser ? 'Find Talent' : 'Discover'}
              </Text>
            </View>
            <View style={[styles.headerRight, { marginTop: 6 }]}>
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
                <Ionicons name="location-outline" size={14} color={isGPSLocation ? '#1D9E75' : '#D85A30'} />
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: isGPSLocation ? '#1D9E75' : theme.text.secondary, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {cityLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color={isGPSLocation ? '#1D9E75' : theme.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/feed' as never)}
                style={styles.networkBtn}
                activeOpacity={0.8}
                accessibilityLabel="Posts feed"
              >
                <Ionicons name="images-outline" size={20} color={theme.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/find-people' as never)}
                style={styles.networkBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={20} color={theme.text.secondary} />
              </TouchableOpacity>
              <NotificationBell />
            </View>
          </View>
        </View>
        <SuggestedStylists
          theme={theme}
          label={isSalonUser ? 'Workers near you' : 'Suggested stylists'}
        />
        {/* ── All / Saved tab toggle ── */}
        <View style={[styles.discoverTabRow, { borderBottomColor: theme.border.subtle }]}>
          {(['All', 'Saved'] as const).map((t) => {
            const active = activeDiscoverTab === t
            return (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setActiveDiscoverTab(t)
                }}
                style={[
                  styles.discoverTab,
                  active
                    ? { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 }
                    : { borderBottomColor: 'transparent', borderBottomWidth: 2 },
                ]}
              >
                <Text style={[styles.discoverTabText, { color: active ? theme.brand.primary : theme.text.tertiary }]}>
                  {t === 'Saved' && savedWorkerIds.size > 0 ? `Saved (${savedWorkerIds.size})` : t}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <View style={styles.sectionRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
              {activeDiscoverTab === 'Saved'
                ? 'Saved professionals'
                : isSalonUser
                  ? 'Workers near you'
                  : isClientUser
                    ? (discoverMode === 'salons' ? 'Salons & studios' : 'Stylists & freelancers')
                    : 'Professionals near you'}
            </Text>
            {!isSalonUser && activeDiscoverTab !== 'Saved' && discoverMode === 'workers' && (
              <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 1 }}>
                Mobile · home studio · freelance
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.expandedBadge,
              (isExpanded || radiusMode === 'custom')
                ? { backgroundColor: 'rgba(216,90,48,0.10)' }
                : { backgroundColor: theme.bg.elevated },
            ]}
            onPress={() => setShowRadiusPicker(true)}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[
              styles.expandedNote,
              { color: (isExpanded || radiusMode === 'custom') ? '#D85A30' : theme.text.tertiary },
            ]}>
              {radiusMiles} mi
            </Text>
            <Ionicons
              name="chevron-down"
              size={10}
              color={(isExpanded || radiusMode === 'custom') ? '#D85A30' : theme.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, isExpanded, usedRadius, isGPSLocation, cityLabel, openLocationModal, radiusMode, radiusMiles, activeDiscoverTab, savedWorkerIds, isSalonUser, isClientUser, discoverMode],
  )

  const listEmpty = useMemo(
    () =>
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
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Couldn't load professionals</Text>
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
              name={activeDiscoverTab === 'Saved' ? 'bookmark-outline' : search.trim().length > 0 ? 'search-outline' : 'people-outline'}
              size={28}
              color="#1D9E75"
            />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
            {activeDiscoverTab === 'Saved'
              ? 'No saved professionals'
              : search.trim().length > 0
                ? 'No matching results'
                : isSalonUser
                  ? `No workers in ${cityLabel} yet`
                  : `No pros in ${cityLabel} yet`}
          </Text>
          <Text style={[styles.stateText, { color: theme.text.secondary }]}>
            {activeDiscoverTab === 'Saved'
              ? 'Tap the bookmark icon on any worker profile to save them'
              : search.trim().length > 0
                ? 'Try different keywords or adjust your filters'
                : isSalonUser
                  ? 'Post a job to attract workers in your area'
                  : 'Be the first to join My Salon In in your area'}
          </Text>
          {search.trim().length === 0 && (
            isSalonUser ? (
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                onPress={() => router.push('/jobs/create' as never)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Post a job</Text>
              </TouchableOpacity>
            ) : (
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
            )
          )}
          <TouchableOpacity onPress={() => setLocationModalVisible(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 14, color: theme.text.tertiary, textDecorationLine: 'underline' }}>Change location</Text>
          </TouchableOpacity>
        </View>
      ),
    [isLoading, error, search, cityLabel, theme, refresh, setLocationModalVisible, isSalonUser, activeDiscoverTab],
  )

  const listFooter = useMemo(
    () =>
      hasMore && isLoadingMore ? (
        <View style={styles.footer}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : null,
    [hasMore, isLoadingMore, theme.brand.primary],
  )

  const contentContainerStyle = useMemo(
    () => [styles.listContent, { paddingBottom: 56 + bottom + 16 }],
    [bottom],
  )

  if (!hasLocation) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        {/* Booksy-style "Find beauty near you" location gate */}
        <View style={styles.locGateWrap}>
          {/* Map pin illustration */}
          <View style={styles.locIllustration}>
            <View style={[styles.locMapBg, { backgroundColor: theme.bg.surface }]}>
              <View style={styles.locPinLg}>
                <Ionicons name="location" size={36} color="#D85A30" />
              </View>
              <View style={[styles.locPinSm, { top: 20, left: 24 }]}>
                <Ionicons name="location" size={20} color={theme.text.tertiary} />
              </View>
              <View style={[styles.locPinSm, { top: 30, right: 30 }]}>
                <Ionicons name="location" size={16} color={theme.text.tertiary} />
              </View>
              <View style={[styles.locPinSm, { bottom: 18, left: 40 }]}>
                <Ionicons name="location" size={14} color={theme.text.tertiary} />
              </View>
            </View>
          </View>

          <Text style={[styles.locGateTitle, { color: theme.text.primary }]}>
            Find beauty near you
          </Text>
          <Text style={[styles.locGateSub, { color: theme.text.secondary }]}>
            {isSalonUser
              ? 'Connect with available talent in your area'
              : 'Discover top-rated beauty pros and salons near you'}
          </Text>

          {status === 'requesting' ? (
            <View style={styles.gpsLoading}>
              <ActivityIndicator color="#D85A30" />
              <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 8 }}>
                Getting your location…
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.locGpsBtn}
              onPress={async () => {
                const granted = await requestLocation()
                if (granted) {
                  try {
                    const cats = await AsyncStorage.getItem('salonin-preferred-categories')
                    if (!cats) {
                      router.push('/category-select' as never)
                    }
                  } catch { /* ignore */ }
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={styles.locGpsBtnText}>Use my location</Text>
            </TouchableOpacity>
          )}

          {status !== 'requesting' && (
            <>
              <View style={styles.locOrRow}>
                <View style={[styles.locOrLine, { backgroundColor: theme.border.subtle }]} />
                <Text style={[styles.locOrText, { color: theme.text.tertiary }]}>or</Text>
                <View style={[styles.locOrLine, { backgroundColor: theme.border.subtle }]} />
              </View>
              <TouchableOpacity
                style={[styles.locSearchBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
                onPress={() => {
                  afterLocationSetRef.current = true
                  setLocationModalVisible(true)
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="search-outline" size={16} color={theme.text.tertiary} />
                <Text style={[styles.locSearchText, { color: theme.text.tertiary }]}>
                  Search a city…
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <LocationModal
          visible={locationModalVisible}
          onClose={async () => {
            setLocationModalVisible(false)
            if (afterLocationSetRef.current) {
              afterLocationSetRef.current = false
              // Check if categories were already chosen
              try {
                const cats = await AsyncStorage.getItem('salonin-preferred-categories')
                if (!cats) {
                  router.push('/category-select' as never)
                  return
                }
              } catch {
                // ignore
              }
            }
          }}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* ── Search (filter icon inside, matching JobFeedScreen) ── */}
        <View style={[styles.searchRow, { backgroundColor: theme.bg.base }]}>
          <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={isSalonUser ? 'Search workers, skills...' : isClientUser ? 'Search stylists, services...' : 'Search workers, specialties...'}
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

        {/* ── Booksy-style category category pills (emoji + label) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={[styles.chipsRow, { backgroundColor: theme.bg.base }]}
        >
          {/* Available Now quick-filter */}
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
                  styles.categoryPill,
                  {
                    backgroundColor: availActive ? '#1D9E75' : theme.bg.card,
                    borderColor: availActive ? '#1D9E75' : theme.border.default,
                  },
                ]}
              >
                <Text style={styles.categoryPillEmoji}>⚡</Text>
                <Text style={[styles.categoryPillLabel, { color: availActive ? '#FFFFFF' : theme.text.secondary }]}>
                  Available Now
                </Text>
              </TouchableOpacity>
            )
          })()}
          {/* All button */}
          {(() => {
            const active = selectedSpecialty === 'All'
            return (
              <TouchableOpacity
                onPress={() => handleToggleSpecialty('All')}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: active ? '#D85A30' : theme.bg.card,
                    borderColor: active ? '#D85A30' : theme.border.default,
                  },
                ]}
              >
                <Text style={styles.categoryPillEmoji}>✨</Text>
                <Text style={[styles.categoryPillLabel, { color: active ? '#fff' : theme.text.secondary }]}>All</Text>
              </TouchableOpacity>
            )
          })()}
          {/* Category pills from SPECIALTY_CATEGORIES */}
          {SPECIALTY_CATEGORIES.map((cat) => {
            const active = selectedSpecialty !== 'All' &&
              ALL_SPECIALTIES.some((sp) => sp.categoryId === cat.id && sp.id === selectedSpecialty)
            const emoji = CATEGORY_EMOJIS[cat.id] ?? '🌟'
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  // Select the first specialty of this category
                  const first = ALL_SPECIALTIES.find((sp) => sp.categoryId === cat.id)
                  handleToggleSpecialty(first?.id ?? 'All')
                }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: active ? '#D85A30' : theme.bg.card,
                    borderColor: active ? '#D85A30' : theme.border.default,
                  },
                ]}
              >
                <Text style={styles.categoryPillEmoji}>{emoji}</Text>
                <Text style={[styles.categoryPillLabel, { color: active ? '#fff' : theme.text.secondary }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* ── Workers / Salons mode toggle — hidden for salons (they only browse workers) ── */}
        {!isSalonUser && (
          <View style={[styles.modeRow, { borderBottomColor: theme.border.subtle }]}>
            {(['workers', 'salons'] as const).map((m) => {
              const active = discoverMode === m
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setDiscoverMode(m)
                  }}
                  style={[styles.modeTab, active && { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: active ? '700' : '500', color: active ? theme.text.primary : theme.text.secondary }}>
                    {m === 'workers'
                      ? (isClientUser ? 'Stylists' : 'Professionals')
                      : 'Salons & Studios'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {discoverMode === 'workers' ? (
          <FlatList
            data={filteredWorkers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={contentContainerStyle}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
            refreshing={isRefreshing}
            onRefresh={refresh}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={filteredSalons}
            keyExtractor={(item) => item.id}
            renderItem={renderSalonItem}
            contentContainerStyle={contentContainerStyle}
            ListEmptyComponent={
              salonsLoading ? (
                <View style={styles.skeletonList}>
                  {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <SalonCardSkeleton key={i} />
                  ))}
                </View>
              ) : salonsError != null ? (
                <View style={styles.centerPane}>
                  <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Couldn&apos;t load salons</Text>
                  <Text style={[styles.stateText, { color: theme.text.secondary }]}>{salonsError.message}</Text>
                  <Button variant="secondary" onPress={refreshSalons}>Try again</Button>
                </View>
              ) : (
                <View style={styles.centerPane}>
                  <View style={[styles.emptyIcon, { backgroundColor: 'rgba(29,158,117,0.10)' }]}>
                    <Ionicons name="business-outline" size={28} color="#1D9E75" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No salons in {cityLabel} yet</Text>
                  <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                    Try a different specialty or widen your search radius.
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              salonsHasMore && salonsLoadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={theme.brand.primary} />
                </View>
              ) : null
            }
            refreshing={salonsRefreshing}
            onRefresh={refreshSalons}
            onEndReached={loadMoreSalons}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
          />
        )}

        <ReportModal
          isVisible={reportTarget !== null}
          reportedName={reportTarget?.name ?? ''}
          onClose={() => setReportTarget(null)}
          onSubmit={async (type, reason) => {
            if (!reportTarget) return
            await reportsApi.createReport(reportTarget.userId ?? reportTarget.id, type, reason)
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

        <RadiusPickerSheet
          visible={showRadiusPicker}
          onClose={() => setShowRadiusPicker(false)}
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
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 42,
    flexShrink: 0,
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
    maxWidth: 110,
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
  networkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  discoverTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeTab: {
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  discoverTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  discoverTabText: {
    fontSize: 14,
    fontWeight: '700',
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
  listContent: { paddingTop: 0 },
  skeletonList: { gap: 8, paddingTop: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  expandedBadge: {
    backgroundColor: 'rgba(216,90,48,0.10)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  expandedNote: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D85A30',
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
  // ── Booksy-style location gate ─────────────────────────────────────────────
  locGateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  locIllustration: {
    marginBottom: 8,
  },
  locMapBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  locPinLg: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locPinSm: {
    position: 'absolute',
  },
  locGateTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  locGateSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  locGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D85A30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    width: '100%',
    marginTop: 4,
  },
  locGpsBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  locOrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  locOrLine: {
    flex: 1,
    height: 1,
  },
  locOrText: {
    fontSize: 13,
  },
  locSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  locSearchText: {
    fontSize: 15,
  },
  // ── Booksy-style category pills ────────────────────────────────────────────
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPillEmoji: {
    fontSize: 15,
  },
  categoryPillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
})

// ── Suggested People (shared card design) ────────────────────────────────────

const AVATAR_D = 62
const RING_W = 2.5
const RING_GAP = 2
const RING_D = AVATAR_D + (RING_W + RING_GAP) * 2

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

interface SuggestedCardProps {
  user: SuggestedUser
  theme: Theme
  isFollowed: boolean
  storyState: 'unseen' | 'seen' | 'none'
  onFollow: () => void
  onMessage: () => void
  onStoryPress?: () => void
}

function SuggestedCard({ user, theme, isFollowed, storyState, onFollow, onMessage: _onMessage, onStoryPress }: SuggestedCardProps) {
  const name = user.name ?? ''
  const specialties = user.specialties ?? []
  const specialty = specialtyLabel(specialties[0]) || (user.type === 'salon' ? 'Salon' : 'Stylist')
  const hasRing = storyState !== 'none'
  const ringColor = storyState === 'unseen' ? '#D85A30' : '#8B9BB4'
  const profilePath = user.type === 'salon' ? `/salon/${user.id}` : `/worker/${user.id}`
  const [showFollowedLabel, setShowFollowedLabel] = React.useState(false)
  const initial = name.charAt(0).toUpperCase()
  const rating = user.rating ?? 0

  const handleFollowPress = () => {
    onFollow()
    if (!isFollowed) {
      setShowFollowedLabel(true)
      setTimeout(() => setShowFollowedLabel(false), 2000)
    }
  }

  return (
    <TouchableOpacity
      style={[suggestStyles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
      activeOpacity={0.9}
      onPress={() => router.push(profilePath as never)}
    >
      {/* ── Avatar + overlaid badges ── */}
      <View style={[suggestStyles.avatarWrap, { width: RING_D, height: RING_D }]}>
        {hasRing && (
          <TouchableOpacity
            onPress={onStoryPress}
            activeOpacity={0.85}
            style={[suggestStyles.ring, { borderColor: ringColor, width: RING_D, height: RING_D, borderRadius: RING_D / 2 }]}
          />
        )}
        <View style={suggestStyles.avatar}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={suggestStyles.avatarImg} />
          ) : (
            <View style={[suggestStyles.avatarFallback, { backgroundColor: theme.bg.elevated }]}>
              <Text style={[suggestStyles.avatarInitial, { color: theme.brand.primary }]}>{initial}</Text>
            </View>
          )}
        </View>

        {/* Verified badge — top-right */}
        {user.isVerified && (
          <View style={[suggestStyles.verifiedBadge, { backgroundColor: theme.bg.card }]}>
            <Ionicons name="checkmark-circle" size={14} color="#1877F2" />
          </View>
        )}

        {/* Follow (+/✓) — bottom-right, on avatar ring */}
        <TouchableOpacity
          style={[
            suggestStyles.followOverlay,
            {
              backgroundColor: isFollowed ? '#1D9E75' : theme.brand.primary,
              borderColor: theme.bg.card,
            },
          ]}
          onPress={handleFollowPress}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={isFollowed ? 'checkmark' : 'add'} size={12} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Name (1 line, truncated) ── */}
      <Text style={[suggestStyles.name, { color: theme.text.primary }]} numberOfLines={1}>
        {name}
      </Text>

      {/* ── Followed feedback (2 s) OR specialty ── */}
      {showFollowedLabel ? (
        <Text style={[suggestStyles.followedLabel, { color: '#1D9E75' }]}>Followed ✓</Text>
      ) : (
        <Text style={[suggestStyles.specialty, { color: theme.text.tertiary }]} numberOfLines={1}>
          {specialty}
        </Text>
      )}

      {/* ── Rating ★ (reviewCount) ── */}
      <View style={suggestStyles.statsRow}>
        <Text style={[suggestStyles.statVal, { color: theme.text.secondary, fontWeight: '700' }]}>
          {rating.toFixed(1)}
        </Text>
        <Ionicons name="star" size={10} color="#EF9F27" />
        {(user.reviewCount ?? 0) > 0 && (
          <Text style={[suggestStyles.statVal, { color: theme.text.tertiary }]}>
            ({formatCount(user.reviewCount ?? 0)})
          </Text>
        )}
      </View>

      {/* ── Followers count ── */}
      <View style={suggestStyles.statsRow}>
        <Ionicons name="people-outline" size={10} color={theme.text.tertiary} />
        <Text style={[suggestStyles.statVal, { color: theme.text.tertiary }]}>
          {formatCount(user.followersCount ?? 0)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function SuggestedCardSkeleton({ theme }: { theme: Theme }) {
  const bg = theme.border.default
  return (
    <View style={[suggestStyles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={[suggestStyles.skeletonAvatar, { backgroundColor: bg }]} />
      <View style={[suggestStyles.skeletonLine, { width: 60, backgroundColor: bg }]} />
      <View style={[suggestStyles.skeletonLine, { width: 44, backgroundColor: bg }]} />
      <View style={[suggestStyles.skeletonLine, { width: 52, backgroundColor: bg }]} />
      <View style={[suggestStyles.skeletonBtn, { backgroundColor: bg }]} />
    </View>
  )
}

// ── Suggested Stylists (Discover page — workers only) ─────────────────────────

function SuggestedStylists({ theme, label = 'Suggested stylists' }: { theme: Theme; label?: string }) {
  const { suggestions, isLoading } = useSuggestedUsers()
  const { storyMap, openViewerForUser } = useStories()
  const [followedIds, setFollowedIds] = React.useState<Set<string>>(new Set())
  const gate = useAuthGate()

  const workers = React.useMemo(() => suggestions.filter((s) => s.type === 'worker'), [suggestions])

  if (!isLoading && workers.length === 0) return null

  const handleFollow = (userId: string) => {
    gate(
      async () => {
        setFollowedIds((prev) => new Set([...prev, userId]))
        const { followsApi } = await import('@salonin/api-client')
        await followsApi.follow(userId).catch(() => {
          setFollowedIds((prev) => { const next = new Set(prev); next.delete(userId); return next })
        })
      },
      { message: 'Sign in to follow this professional' },
    )
  }

  const handleMessage = (userId: string, name: string, photoUrl: string | null) => {
    gate(
      async () => {
        try {
          const conv = await messagesApi.createConversation(userId)
          router.push({ pathname: '/chat/[id]', params: { id: conv.id, name, otherUserId: userId, otherPhotoUrl: photoUrl ?? '' } } as never)
        } catch { /* silent */ }
      },
      { message: 'Sign in to message this professional' },
    )
  }

  return (
    <View style={suggestStyles.section}>
      <View style={suggestStyles.sectionHeader}>
        <Text style={[suggestStyles.sectionTitle, { color: theme.text.primary }]}>{label}</Text>
        <TouchableOpacity onPress={() => router.push('/find-people' as never)} activeOpacity={0.7}>
          <Text style={[suggestStyles.seeAll, { color: theme.brand.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={suggestStyles.row}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SuggestedCardSkeleton key={i} theme={theme} />)
          : workers.map((u) => {
              const ss = storyMap.get(u.id)
              const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
              return (
                <SuggestedCard
                  key={u.id}
                  user={u}
                  theme={theme}
                  isFollowed={followedIds.has(u.id)}
                  storyState={storyState}
                  onFollow={() => void handleFollow(u.id)}
                  onMessage={() => void handleMessage(u.id, u.name, u.photoUrl)}
                  onStoryPress={ss?.hasStory ? () => openViewerForUser(u.id) : undefined}
                />
              )
            })}
      </ScrollView>
    </View>
  )
}

// ── Suggested Salons (Jobs page — exported for use there) ─────────────────────

export function SuggestedSalons({ theme }: { theme: Theme }) {
  const { suggestions, isLoading } = useSuggestedUsers()
  const { storyMap, openViewerForUser } = useStories()
  const [followedIds, setFollowedIds] = React.useState<Set<string>>(new Set())
  const gate = useAuthGate()

  const salons = React.useMemo(() => suggestions.filter((s) => s.type === 'salon'), [suggestions])

  if (!isLoading && salons.length === 0) return null

  const handleFollow = (userId: string) => {
    gate(
      async () => {
        setFollowedIds((prev) => new Set([...prev, userId]))
        const { followsApi } = await import('@salonin/api-client')
        await followsApi.follow(userId).catch(() => {
          setFollowedIds((prev) => { const next = new Set(prev); next.delete(userId); return next })
        })
      },
      { message: 'Sign in to follow this salon' },
    )
  }

  const handleMessage = (userId: string, name: string, photoUrl: string | null) => {
    gate(
      async () => {
        try {
          const conv = await messagesApi.createConversation(userId)
          router.push({ pathname: '/chat/[id]', params: { id: conv.id, name, otherUserId: userId, otherPhotoUrl: photoUrl ?? '' } } as never)
        } catch { /* silent */ }
      },
      { message: 'Sign in to message this salon' },
    )
  }

  return (
    <View style={suggestStyles.section}>
      <View style={suggestStyles.sectionHeader}>
        <Text style={[suggestStyles.sectionTitle, { color: theme.text.primary }]}>Top salons near you</Text>
        <TouchableOpacity onPress={() => router.push('/find-people' as never)} activeOpacity={0.7}>
          <Text style={[suggestStyles.seeAll, { color: theme.brand.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={suggestStyles.row}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SuggestedCardSkeleton key={i} theme={theme} />)
          : salons.map((u) => {
              const ss = storyMap.get(u.id)
              const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
              return (
                <SuggestedCard
                  key={u.id}
                  user={u}
                  theme={theme}
                  isFollowed={followedIds.has(u.id)}
                  storyState={storyState}
                  onFollow={() => void handleFollow(u.id)}
                  onMessage={() => void handleMessage(u.id, u.name, u.photoUrl)}
                  onStoryPress={ss?.hasStory ? () => openViewerForUser(u.id) : undefined}
                />
              )
            })}
      </ScrollView>
    </View>
  )
}

const suggestStyles = StyleSheet.create({
  section: { paddingTop: 4, paddingBottom: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  row: { paddingHorizontal: 12, gap: 8, paddingBottom: 2 },

  card: {
    width: 86,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 1,
  },

  // Avatar + ring
  avatarWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  ring: { position: 'absolute', borderWidth: RING_W },
  avatar: { width: AVATAR_D, height: AVATAR_D, borderRadius: AVATAR_D / 2, overflow: 'hidden' },
  avatarImg: { width: AVATAR_D, height: AVATAR_D },
  avatarFallback: { width: AVATAR_D, height: AVATAR_D, borderRadius: AVATAR_D / 2, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '800' },

  // Verified badge — top-right of avatar frame
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Follow button — bottom-right overlay, on avatar circle edge
  followOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  // Text content
  name: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 13, letterSpacing: -0.2, width: '100%' },
  followedLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  specialty: { fontSize: 10, textAlign: 'center', width: '100%', opacity: 0.6, lineHeight: 12 },

  // Stats rows
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statVal: { fontSize: 10, fontWeight: '600' },
  statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#8B9BB4' },

  // Skeletons
  skeletonAvatar: { width: RING_D, height: RING_D, borderRadius: RING_D / 2, marginBottom: 6 },
  skeletonLine: { height: 9, borderRadius: 5, marginTop: 3 },
  skeletonBtn: { width: 60, height: 9, borderRadius: 5, marginTop: 3 },
})

