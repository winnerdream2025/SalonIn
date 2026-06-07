import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
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
import { useAuthStore } from '../../store/authStore'
import { NotificationBell } from '../../components/NotificationBell'
import { jobsApi } from '@salonin/api-client'

const SPECIALTIES = ['All', 'Knotless', 'Braids', 'Color', 'Locs', 'Wigs', 'Nails', 'Lashes']

const CITY_PRESETS = [
  { cityId: 'dmv',     label: 'Washington DC / DMV', lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA',          lat: 33.749,  lng: -84.388  },
  { cityId: 'houston', label: 'Houston, TX',          lat: 29.7604, lng: -95.3698 },
  { cityId: 'miami',   label: 'Miami, FL',            lat: 25.7617, lng: -80.1918 },
]

const SKELETON_COUNT = 5

export default function JobFeedScreen() {
  const { bottom, top } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const userRole = useAuthStore((s) => s.user?.role)
  const isSalon = userRole === 'SALON'

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All')
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [search, setSearch] = useState('')

  const cityLabel = CITY_PRESETS.find((c) => c.cityId === cityId)?.label ?? cityId?.toUpperCase() ?? ''
  const specialtyFilter = selectedSpecialty === 'All' ? undefined : selectedSpecialty

  const { jobs, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore } =
    useJobFeed({ specialty: specialtyFilter })

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.specialty.toLowerCase().includes(q) ||
      j.salonName.toLowerCase().includes(q)
    )
  }, [jobs, search])

  const handlePressJob = useCallback((job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }, [])

  const handleApplyJob = useCallback(async (job: JobPostCardData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await jobsApi.apply(job.id)
      Alert.alert('Applied!', 'Your application has been sent to the salon.')
    } catch (e) {
      Alert.alert('Apply failed', e instanceof Error ? e.message : 'Please try again.')
    }
  }, [])

  const handleMessageSalon = useCallback((_job: JobPostCardData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Coming soon', 'Direct messaging from job cards will be available soon.')
  }, [])

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

  const SearchAndFilters = (
    <View style={{ gap: 12 }}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: theme.bg.input }]}>
        <Ionicons name="search" size={20} color={theme.text.tertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, salons, skills..."
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary }]}
          returnKeyType="search"
        />
        <Ionicons name="options-outline" size={20} color={theme.text.tertiary} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
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
            Choose your city to find nearby job posts
          </Text>
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
        </View>
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
        <View style={[styles.headerSection, { paddingTop: top > 0 ? 8 : 16 }]}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serifTitle, { color: theme.text.primary }]}>Jobs</Text>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                Find your next opportunity ✨
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
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary }}>
                  {cityId.toUpperCase()}
                </Text>
                <Ionicons name="chevron-down" size={14} color={theme.text.tertiary} />
              </TouchableOpacity>
              <NotificationBell />
            </View>
          </View>

          {SearchAndFilters}
        </View>

        {/* Location Modal */}
        <Modal
          visible={showLocationModal}
          transparent
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={[styles.modalOverlay, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalSheet, { backgroundColor: theme.bg.surface }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.border.default }]} />
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
                  Change City
                </Text>
                <TouchableOpacity onPress={() => setShowLocationModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 15, color: theme.brand.primary, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
              {CITY_PRESETS.map((city) => (
                <TouchableOpacity
                  key={city.cityId}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    setLocation(city.cityId, city.lat, city.lng)
                    setShowLocationModal(false)
                  }}
                  style={[styles.cityRow, { borderBottomColor: theme.border.subtle }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary, flex: 1 }}>{city.label}</Text>
                  {cityId === city.cityId && (
                    <Text style={{ color: theme.brand.primary, fontSize: 16, fontWeight: '700' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Job list */}
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobPostCard
              job={item}
              onPress={() => handlePressJob(item)}
              onApply={!isSalon ? () => void handleApplyJob(item) : undefined}
              onMessage={() => handleMessageSalon(item)}
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
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {error.message}
                </Text>
                <Button variant="secondary" onPress={refresh}>Retry</Button>
              </View>
            ) : (
              <View style={styles.centerPane}>
                <Text style={[styles.stateText, { fontSize: 18, fontWeight: '700', color: theme.text.primary }]}>
                  {search.trim().length > 0
                    ? 'No matching jobs'
                    : `No open positions in ${cityLabel} right now`}
                </Text>
                <Text style={[styles.stateText, { color: theme.text.secondary }]}>
                  {search.trim().length > 0
                    ? 'Try a different search term'
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
            <Text style={styles.fabLabel}>Post Job</Text>
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
    color: '#1A1A1A',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
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
    paddingBottom: 12,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
