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
import { JobPostCard, JobPostCardSkeleton, Text, Button, useTheme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useJobFeed } from '../../hooks/useJobFeed'
import { useLocationStore } from '../../store/locationStore'
import { useAuthStore } from '../../store/authStore'

const SPECIALTIES = [
  'Haircut', 'Color', 'Balayage', 'Locs', 'Braids', 'Natural', 'Extensions', 'Weave',
]

const CITY_PRESETS = [
  { cityId: 'dmv', label: 'Washington DC / DMV', lat: 38.9072, lng: -77.0369 },
  { cityId: 'atlanta', label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
]

const SKELETON_COUNT = 5

export default function JobFeedScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const cityId = useLocationStore((s) => s.cityId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const userRole = useAuthStore((s) => s.user?.role)

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()

  const { jobs, isLoading, isRefreshing, isLoadingMore, error, refresh, loadMore } =
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
          <Text variant="caption" color="secondary">{cityId.toUpperCase()}</Text>
          {userRole === 'SALON' && (
            <TouchableOpacity
              onPress={() => router.push('/jobs/create')}
              style={[styles.postBtn, { backgroundColor: theme.brand.primary }]}
            >
              <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>+ Post</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
              <Text variant="body" color="secondary" style={styles.stateText}>
                No hiring posts found nearby.
              </Text>
              <Text variant="caption" color="secondary">
                Try clearing the specialty filter.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
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
})
