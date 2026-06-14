import React, { useState, useCallback, useMemo } from 'react'
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
import { getCityLabel } from '@salonin/config'
import { useJobFeed } from '../../hooks/useJobFeed'
import { useLocationStore } from '../../store/locationStore'
import { LocationModal } from '../../components/LocationModal'
import { useAuthStore } from '../../store/authStore'
import { NotificationBell } from '../../components/NotificationBell'
import { jobsApi, messagesApi, parseApiError } from '@salonin/api-client'
import { JobFilterModal, activeFilterCount, EMPTY_JOB_FILTERS } from '../../components/JobFilterModal'
import type { JobFilters } from '../../components/JobFilterModal'

const LISTING_TYPES = [
  { value: undefined, label: 'All' },
  { value: 'JOB',    label: 'Jobs' },
  { value: 'RENTAL', label: 'Rentals' },
  { value: 'SPACE',  label: 'Spaces' },
] as const

const SPECIALTIES = ['All', 'Knotless', 'Braids', 'Color', 'Locs', 'Wigs', 'Nails', 'Lashes']

const SKELETON_COUNT = 5

export default function JobFeedScreen() {
  const { bottom, top } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const user = useAuthStore((s) => s.user)
  const isSalon = user?.role === 'SALON'

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All')
  const [selectedListingType, setSelectedListingType] = useState<string | undefined>(undefined)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [jobFilters, setJobFilters] = useState<JobFilters>(EMPTY_JOB_FILTERS)
  const filterCount = activeFilterCount(jobFilters)

  const cityLabel = getCityLabel(cityId)
  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { jobs, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore } =
    useJobFeed({ specialty: specialtyFilter, listingType: selectedListingType })

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

  const handleApplyJob = useCallback(async (job: JobPostCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to apply for jobs.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ])
      return
    }
    setApplyingId(job.id)
    try {
      await jobsApi.apply(job.id)
      const detail = await jobsApi.getById(job.id)
      const conv = await messagesApi.createConversation(detail.salon.userId)
      await messagesApi.sendMessage(
        conv.id,
        `Hi! I applied to your "${job.title}" position. I'd love to discuss the opportunity.`,
      )
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
  }, [user])

  const handleMessageSalon = useCallback(async (job: JobPostCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to message salons.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ])
      return
    }
    setMessagingId(job.id)
    try {
      const detail = await jobsApi.getById(job.id)
      const conv = await messagesApi.createConversation(detail.salon.userId)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(job.salonName)}` as never)
    } catch (e: unknown) {
      Alert.alert('Messaging failed', parseApiError(e))
    } finally {
      setMessagingId(null)
    }
  }, [user])

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const handleToggleSave = useCallback((job: JobPostCardData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(job.id)) next.delete(job.id)
      else next.add(job.id)
      return next
    })
  }, [])

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

  const SearchAndFilters = (
    <View style={styles.filtersWrap}>
      {/* Search bar */}
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
          {filterCount > 0 && (
            <View style={styles.filterDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* Listing type + Specialty pills — single scrollable row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
          SPECIALTIES.filter((s) => s !== 'All').map((s) => {
            const active = selectedSpecialty === s
            return (
              <TouchableOpacity
                key={s}
                onPress={() => handleToggleSpecialty(s)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                    borderColor: active ? '#D85A30' : theme.border.default,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text.secondary }}>
                  {s}
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
          <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Jobs</Text>
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.headerSection, { paddingTop: top + 8 }]}>
          <View style={styles.headerAccent} pointerEvents="none">
            <View style={styles.accentGlow} />
            <View style={styles.accentPill} />
          </View>

          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Beauty work</Text>
                <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                  Jobs, rentals & spaces
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
                  <Ionicons name="location-outline" size={14} color={theme.text.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary }} numberOfLines={1}>
                    {cityLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.text.tertiary} />
                </TouchableOpacity>
                <NotificationBell />
              </View>
            </View>
          </View>
        </View>

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

        {/* Job list */}
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={SearchAndFilters}
          renderItem={({ item }) => (
            <JobPostCard
              job={item}
              onPress={() => handlePressJob(item)}
              onApply={!isSalon && applyingId !== item.id ? () => void handleApplyJob(item) : undefined}
              onMessage={messagingId !== item.id ? () => void handleMessageSalon(item) : undefined}
              onSave={() => handleToggleSave(item)}
              isSaved={savedJobIds.has(item.id)}
            />
          )}
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
                <Text style={[styles.stateText, { fontSize: 16, fontWeight: '600', color: theme.text.primary }]}>
                  Couldn't load listings
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {error.message.includes('network') || error.message.includes('Network')
                    ? 'Check your connection and try again.'
                    : error.message}
                </Text>
                <Button variant="secondary" onPress={refresh}>Retry</Button>
              </View>
            ) : (
              <View style={styles.centerPane}>
                <Text style={[styles.stateText, { fontSize: 18, fontWeight: '700', color: theme.text.primary }]}>
                  {search.trim().length > 0
                    ? 'No matching results'
                    : selectedListingType === 'RENTAL'
                    ? `No booth rentals in ${cityLabel}`
                    : selectedListingType === 'SPACE'
                    ? `No salon spaces in ${cityLabel}`
                    : `No open positions in ${cityLabel} right now`}
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {search.trim().length > 0
                    ? 'Try a different search term'
                    : selectedListingType === 'RENTAL' || selectedListingType === 'SPACE'
                    ? 'New listings are added regularly — check back soon'
                    : 'New jobs are posted daily — check back soon'}
                </Text>
                {search.trim().length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                    onPress={() =>
                      Alert.alert('Job Alerts', 'We’ll notify you when new jobs are posted in your area.')
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Set up job alerts</Text>
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

        {/* FAB */}
        {isSalon && (
          <TouchableOpacity
            onPress={handlePostJob}
            style={[styles.fab, { backgroundColor: theme.brand.primary, bottom: bottom + 72 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
            <Text style={[styles.fabLabel, { color: theme.text.primary }]}>Post Job</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
  },
  accentGlow: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(216,90,48,0.10)',
  },
  accentPill: {
    position: 'absolute',
    top: 60,
    left: -10,
    width: 160,
    height: 40,
    borderRadius: 28,
    backgroundColor: 'rgba(216,90,48,0.06)',
    transform: [{ rotate: '-8deg' }],
  },
  headerContent: {
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  filtersWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
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
  filterRow: {
    gap: 7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
  },
  listContent: { paddingTop: 4 },
  skeletonList: { gap: 8, paddingTop: 8 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  centerPane: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 12 },
  locTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  locSubtitle: { textAlign: 'center', paddingHorizontal: 32, fontSize: 14 },
  stateText: { textAlign: 'center', paddingHorizontal: 32 },
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 11,
    fontWeight: '700',
  },
})
