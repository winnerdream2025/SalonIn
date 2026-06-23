import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { JobPostCard, JobPostCardSkeleton, Text, Button, useTheme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useJobFeed } from '../../hooks/useJobFeed'
import { useLocationStore } from '../../store/locationStore'
import { LocationModal } from '../../components/LocationModal'
import { useAuthStore } from '../../store/authStore'
import { useAuthGateStore } from '../../store/authGateStore'
import { NotificationBell } from '../../components/NotificationBell'
import { jobsApi, messagesApi, parseApiError } from '@salonin/api-client'
import { useStories } from '../../contexts/StoriesContext'
import { ALL_SPECIALTIES } from '@salonin/config'
import { JobFilterModal, activeFilterCount, EMPTY_JOB_FILTERS } from '../../components/JobFilterModal'
import type { JobFilters } from '../../components/JobFilterModal'
import { SuggestedSalons } from './DiscoveryFeedScreen'

const LISTING_TYPES = [
  { value: undefined, label: 'All' },
  { value: 'JOB',    label: 'Jobs' },
  { value: 'RENTAL', label: 'Rentals' },
  { value: 'SPACE',  label: 'Spaces' },
] as const

const SPECIALTIES = [{ id: 'All', label: 'All' }, ...ALL_SPECIALTIES]

const SKELETON_COUNT = 5

export default function JobFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { storyMap, openViewerForUser } = useStories()
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)
  const city = useLocationStore((s) => s.city)
  const hasLocation = lat != null && lng != null
  const user = useAuthStore((s) => s.user)
  const isSalon = user?.role === 'SALON'

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All')
  const [selectedListingType, setSelectedListingType] = useState<string | undefined>(undefined)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [jobFilters, setJobFilters] = useState<JobFilters>(EMPTY_JOB_FILTERS)
  const filterCount = activeFilterCount(jobFilters)

  const cityLabel = city ?? 'Set location'
  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { jobs, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore } =
    useJobFeed({ specialty: specialtyFilter, listingType: selectedListingType, status: jobFilters.status ?? undefined })

  const filteredJobs = useMemo(() => {
    let result = jobs
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        j.specialty.toLowerCase().includes(q) ||
        j.salonName.toLowerCase().includes(q) ||
        j.payStructure?.toLowerCase().includes(q)
      )
    }
    if (jobFilters.employmentType) {
      result = result.filter((j) => j.type === jobFilters.employmentType)
    }
    if (jobFilters.payType) {
      result = result.filter((j) =>
        j.payStructure?.toLowerCase().includes(jobFilters.payType!.toLowerCase())
      )
    }
    return result
  }, [jobs, search, jobFilters])

  const handlePressJob = useCallback((job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }, [])

  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [messagingId, setMessagingId] = useState<string | null>(null)

  const showGate = useAuthGateStore((s) => s.show)

  const handleApplyJob = useCallback(async (job: JobPostCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      showGate('/(tabs)/jobs', 'Sign in to apply for jobs')
      return
    }
    setApplyingId(job.id)
    try {
      await jobsApi.apply(job.id)
      const detail = await jobsApi.getById(job.id)
      const conv = await messagesApi.createConversation(detail.salon.userId)
      await messagesApi.sendMessage(conv.id, {
        content: `Hi! I applied to your "${job.title}" position. I'd love to discuss the opportunity.`,
      })
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(job.salonName)}` as never)
    } catch (e: unknown) {
      const msg = parseApiError(e)
      if (msg.toLowerCase().includes('already')) {
        Alert.alert('Already applied', msg)
      } else {
        Alert.alert('Application failed', msg)
      }
    } finally {
      setApplyingId(null)
    }
  }, [user, showGate])

  const handleMessageSalon = useCallback(async (job: JobPostCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      showGate('/(tabs)/messages', 'Sign in to message this salon')
      return
    }
    setMessagingId(job.id)
    try {
      const detail = await jobsApi.getById(job.id)
      const conv = await messagesApi.createConversation(detail.salon.userId)
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: conv.id,
          name: job.salonName,
          otherUserId: detail.salon.userId,
          otherPhotoUrl: detail.salon.photoUrls[0] ?? '',
        },
      } as never)
    } catch (e: unknown) {
      Alert.alert('Messaging failed', parseApiError(e))
    } finally {
      setMessagingId(null)
    }
  }, [user, showGate])

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    jobsApi.getSavedJobIds()
      .then((ids) => setSavedJobIds(new Set(ids)))
      .catch(() => {})
  }, [user])

  const handleToggleSave = useCallback(async (job: JobPostCardData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!user) return
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(job.id)) next.delete(job.id)
      else next.add(job.id)
      return next
    })
    try {
      await jobsApi.toggleSave(job.id)
    } catch {
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (next.has(job.id)) next.delete(job.id)
        else next.add(job.id)
        return next
      })
    }
  }, [user])

  const handleToggleSpecialty = useCallback((specialty: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSpecialty((prev) => (prev === specialty ? 'All' : specialty))
  }, [])

  const handlePostJob = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/jobs/create')
  }, [])

  const handleToggleListingType = useCallback((value: string | undefined) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedListingType((prev) => {
      const next = prev === value ? undefined : value
      if (next === 'RENTAL' || next === 'SPACE') setSelectedSpecialty('All')
      return next
    })
  }, [])

  // ── Search + filter chips (FlatList list header) ──────────────────────────
  const SearchAndFilters = (
    <View style={styles.filtersWrap}>
      <View style={styles.searchPad}>
        <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
          <Ionicons name="search" size={18} color={theme.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search jobs, salons, skills…"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {LISTING_TYPES.map((lt) => {
          const active = selectedListingType === lt.value
          return (
            <TouchableOpacity
              key={lt.label}
              onPress={() => handleToggleListingType(lt.value)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                  borderColor: active ? '#D85A30' : theme.border.default,
                },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text.secondary }}>
                {lt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
        {(selectedListingType === undefined || selectedListingType === 'JOB') &&
          SPECIALTIES.filter((s) => s.id !== 'All').map((s) => {
            const active = selectedSpecialty === s.id
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleToggleSpecialty(s.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                    borderColor: active ? '#D85A30' : theme.border.default,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text.secondary }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            )
          })}
      </ScrollView>
    </View>
  )

  // ── No location state ─────────────────────────────────────────────────────
  if (!hasLocation) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
        <View style={styles.pageHeader}>
          <Text
            style={[styles.serifTitle, { color: theme.text.primary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Jobs
          </Text>
        </View>
        <View style={styles.centerPane}>
          <Text style={[styles.locTitle, { color: theme.text.primary }]}>Where are you?</Text>
          <Text style={[styles.locSubtitle, { color: theme.text.secondary }]}>
            Set your location to find nearby beauty jobs
          </Text>
          <TouchableOpacity
            style={[styles.searchCityBtn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons name="search" size={16} color={theme.text.secondary} />
            <Text style={{ fontSize: 15, color: theme.text.secondary }}>Search a city…</Text>
          </TouchableOpacity>
        </View>
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
        />
      </SafeAreaView>
    )
  }

  // ── Page header (scrolls with the list) ──────────────────────────────────
  const PageHeader = (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.serifTitle, { color: theme.text.primary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Jobs
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowLocationModal(true)
            }}
            style={[styles.locationPill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={14} color="#D85A30" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary, flexShrink: 1 }} numberOfLines={1}>
              {cityLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.text.tertiary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>
      <Text style={[styles.subtitle, { color: theme.text.secondary }]} numberOfLines={1}>
        Find your next opportunity
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
        />

        <JobFilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={jobFilters}
          onApply={setJobFilters}
        />

        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              {PageHeader}
              <SuggestedSalons theme={theme} />
              {SearchAndFilters}
            </View>
          }
          renderItem={({ item }) => {
            const salonUid = item.salonUserId
            const ss = salonUid ? storyMap.get(salonUid) : undefined
            const salonStoryState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
            return (
              <JobPostCard
                job={item}
                onPress={() => handlePressJob(item)}
                onApply={!isSalon && applyingId !== item.id ? () => void handleApplyJob(item) : undefined}
                onMessage={messagingId !== item.id ? () => void handleMessageSalon(item) : undefined}
                onSave={() => handleToggleSave(item)}
                isSaved={savedJobIds.has(item.id)}
                salonStoryState={salonStoryState as 'unseen' | 'seen' | 'none'}
                onSalonStoryPress={ss?.hasStory && salonUid ? () => openViewerForUser(salonUid) : undefined}
              />
            )
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: 56 + bottom + 16 }]}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.skeletonList}>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <JobPostCardSkeleton key={i} />
                ))}
              </View>
            ) : error != null ? (
              <View style={styles.centerPane}>
                <View style={[styles.emptyIcon, { backgroundColor: 'rgba(226,75,74,0.10)' }]}>
                  <Ionicons name="cloud-offline-outline" size={28} color="#E24B4A" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                  Couldn't load listings
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
                <View style={[styles.emptyIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
                  <Ionicons
                    name={search.trim().length > 0 ? 'search-outline' : 'briefcase-outline'}
                    size={28}
                    color="#D85A30"
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                  {search.trim().length > 0
                    ? 'No matching results'
                    : selectedListingType === 'RENTAL'
                    ? `No booth rentals in ${cityLabel}`
                    : selectedListingType === 'SPACE'
                    ? `No salon spaces in ${cityLabel}`
                    : `No open positions in ${cityLabel}`}
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {search.trim().length > 0
                    ? 'Try different keywords or clear your filters'
                    : selectedListingType === 'RENTAL' || selectedListingType === 'SPACE'
                    ? 'New listings are added regularly — check back soon'
                    : 'New jobs are posted daily. Get notified when one matches you.'}
                </Text>
                {search.trim().length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                    onPress={() => router.push('/notifications' as never)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                      Set up job alerts
                    </Text>
                  </TouchableOpacity>
                )}
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

        {isSalon && (
          <TouchableOpacity
            onPress={handlePostJob}
            style={[styles.fab, { backgroundColor: theme.brand.primary, bottom: bottom + 72 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.fabLabel}>Post Job</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Page header (scrolls with list) ──────────────────────────────────────
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 42,
    flexShrink: 0,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 110,
  },

  // ── Search + filter bar ───────────────────────────────────────────────────
  filtersWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  searchPad: {
    paddingHorizontal: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
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
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: { paddingTop: 6 },
  skeletonList: { gap: 8, paddingTop: 8 },
  footer: { paddingVertical: 16, alignItems: 'center' },

  // ── States ────────────────────────────────────────────────────────────────
  centerPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    gap: 12,
  },
  locTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  locSubtitle: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14 },
  stateText: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14, lineHeight: 20 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  searchCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '80%',
  },
  emptyCtaBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center' as const,
    width: '100%',
  },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
