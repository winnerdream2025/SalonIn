import React, { useState, useEffect, useCallback } from 'react'
import { View, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, JobPostCard, Skeleton, Button, useTheme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { jobsApi, salonsApi } from '@salonin/api-client'
import * as Haptics from 'expo-haptics'

export default function SalonJobsScreen() {
  const { theme } = useTheme()
  const [jobs, setJobs] = useState<JobPostCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    setError(null)

    try {
      const salon = await salonsApi.getMe()
      const result = await jobsApi.list({ cityId: salon.cityId, salonId: salon.id })
      setJobs(result.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Failed to load jobs'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    fetchJobs(true)
  }, [fetchJobs])

  const handlePressJob = (job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }

  const handleCreateJob = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/jobs/create')
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
          <Text variant="title">My Jobs</Text>
        </View>
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="100%" height={90} radius={16} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
          <Text variant="title">My Jobs</Text>
        </View>
        <View style={styles.errorState}>
          <Text variant="body" color="secondary">{error.message}</Text>
          <Button variant="secondary" onPress={() => fetchJobs()}>Try again</Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text variant="title" style={styles.headerTitle}>My Jobs</Text>
        <Text variant="caption" color="secondary">{jobs.length} active</Text>
      </View>

      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.bg.elevated }]}>
            <Text style={{ fontSize: 32 }}>📋</Text>
          </View>
          <Text variant="title" style={styles.emptyTitle}>No job posts yet</Text>
          <Text variant="body" color="secondary" style={styles.emptyDesc}>
            Post your first job to start attracting talent.
          </Text>
          <Button variant="primary" onPress={handleCreateJob}>
            Post your first job
          </Button>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <JobPostCard job={item} onPress={() => handlePressJob(item)} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text.secondary}
            />
          }
        />
      )}

      <Pressable
        onPress={handleCreateJob}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: '#D85A30', transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
  headerTitle: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  cardWrap: { marginBottom: 12 },
  skeletonList: { padding: 16, gap: 12 },
  skeletonCard: { marginBottom: 12 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { textAlign: 'center' },
  emptyDesc: { textAlign: 'center', marginBottom: 8 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
})
