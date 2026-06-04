import React, { useState, useCallback } from 'react'
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
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { JobPostCard, JobPostCardSkeleton, Text, Button, useTheme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useJobFeed } from '../../hooks/useJobFeed'
import { useLocationStore } from '../../store/locationStore'
import { useAuthStore } from '../../store/authStore'

const SPECIALTIES = [
  'Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave',
]

const CITY_PRESETS = [
  { cityId: 'dmv',     label: 'Washington DC / DMV', lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA',          lat: 33.749,  lng: -84.388  },
  { cityId: 'houston', label: 'Houston, TX',          lat: 29.7604, lng: -95.3698 },
  { cityId: 'miami',   label: 'Miami, FL',            lat: 25.7617, lng: -80.1918 },
]

const SKELETON_COUNT = 5

export default function JobFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const userRole = useAuthStore((s) => s.user?.role)

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()
  const [showLocationModal, setShowLocationModal] = useState(false)

  const cityLabel = CITY_PRESETS.find((c) => c.cityId === cityId)?.label ?? cityId?.toUpperCase() ?? ''

  const { jobs, isLoading, isRefreshing, isLoadingMore, hasMore, error, refresh, loadMore } =
    useJobFeed({ specialty: selectedSpecialty })

  const handlePressJob = useCallback((job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
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
          <Text variant="title">Hiring Posts</Text>
        </View>
        <View style={styles.centerPane}>
          <Text variant="heading" style={styles.locTitle}>Where are you?</Text>
          <Text variant="body" color="secondary" style={styles.locSubtitle}>
            Choose your city to find nearby job posts
          </Text>
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
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text variant="title">Hiring Posts</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowLocationModal(true)
            }}
            style={[styles.locationPill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
            activeOpacity={0.7}
          >
            <Text variant="caption" style={{ color: theme.text.secondary }}>{cityId.toUpperCase()}</Text>
            <Text style={{ fontSize: 10, color: theme.text.tertiary }}>▾</Text>
          </TouchableOpacity>
          {userRole === 'SALON' && (
            <TouchableOpacity
              onPress={() => router.push('/jobs/create')}
              style={[styles.postBtn, { backgroundColor: theme.brand.primary }]}
            >
              <Text variant="caption" style={{ color: theme.text.inverse, fontWeight: '700' }}>+ Post</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
                <Text style={{ fontSize: 15, color: '#D85A30', fontWeight: '600' }}>Done</Text>
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
                  <Text style={{ color: '#D85A30', fontSize: 16, fontWeight: '700' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobPostCard
            job={item}
            onPress={() => handlePressJob(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 56 + bottom + 16 }]}
        ListHeaderComponent={SpecialtyFilters}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <JobPostCardSkeleton key={i} />
              ))}
            </View>
          ) : error != null ? (
            <View style={styles.centerPane}>
              <Text variant="body" color="secondary" style={styles.stateText}>
                {error.message}
              </Text>
              <Button variant="secondary" onPress={refresh}>Retry</Button>
            </View>
          ) : (
            <View style={styles.centerPane}>
              <Text variant="heading" style={[styles.stateText, { fontSize: 18, fontWeight: '700' }]}>
                No open positions in {cityLabel} right now
              </Text>
              <Text variant="caption" color="secondary" style={styles.stateText}>
                New jobs are posted daily — check back soon
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: theme.brand.primary }]}
                onPress={() =>
                  Alert.alert('Job Alerts', 'We’ll notify you when new jobs are posted in your area.')
                }
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Set up job alerts</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
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
  emptyCtaBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center' as const,
    width: '100%',
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
