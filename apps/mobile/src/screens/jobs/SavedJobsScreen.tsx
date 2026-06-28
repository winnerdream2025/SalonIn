import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { Text, JobPostCard, JobPostCardSkeleton, useTheme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { jobsApi } from '@salonin/api-client'

export default function SavedJobsScreen() {
  const { theme } = useTheme()
  const [jobs, setJobs] = useState<JobPostCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const data = await jobsApi.getSavedJobs()
      setJobs(data)
    } catch {
      // noop — empty state shown
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handlePress = useCallback((job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }, [])

  const handleUnsave = useCallback(async (job: JobPostCardData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setJobs((prev) => prev.filter((j) => j.id !== job.id))
    try {
      await jobsApi.toggleSave(job.id)
    } catch {
      setJobs((prev) => [job, ...prev])
    }
  }, [])

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text.primary }]}>Saved Jobs</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => <JobPostCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={jobs.length === 0 ? s.emptyWrap : { padding: 16 }}
          refreshing={isRefreshing}
          onRefresh={() => void load(true)}
          renderItem={({ item }) => (
            <JobPostCard
              job={item}
              onPress={() => handlePress(item)}
              onSave={() => void handleUnsave(item)}
              isSaved
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.emptyInner}>
              <Ionicons name="bookmark-outline" size={40} color={theme.text.tertiary} />
              <Text style={[s.emptyTitle, { color: theme.text.primary }]}>No saved jobs</Text>
              <Text style={[s.emptySub, { color: theme.text.secondary }]}>
                Tap the bookmark icon on any job listing to save it here
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
