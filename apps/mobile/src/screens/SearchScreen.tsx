import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {
  Text,
  WorkerCard,
  WorkerCardSkeleton,
  JobPostCard,
  JobPostCardSkeleton,
  useTheme,
} from '@salonin/ui'
import type { WorkerCardData, JobPostCardData } from '@salonin/types'
import { messagesApi, jobsApi, parseApiError } from '@salonin/api-client'
import { useNearbyWorkers } from '../hooks/useNearbyWorkers'
import { useStories } from '../contexts/StoriesContext'
import { useJobFeed } from '../hooks/useJobFeed'
import { useAuthStore } from '../store/authStore'

type Tab = 'workers' | 'jobs'

const SKELETON_COUNT = 4

export default function SearchScreen() {
  const { top, bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const { storyMap, openViewerForUser } = useStories()
  const isSalon = user?.role === 'SALON'

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('workers')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const { workers, isLoading: workersLoading } = useNearbyWorkers()
  const { jobs, isLoading: jobsLoading } = useJobFeed()

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workers
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.specialties.some((s) => s.toLowerCase().includes(q))
    )
  }, [workers, query])

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.specialty.toLowerCase().includes(q) ||
        j.salonName.toLowerCase().includes(q)
    )
  }, [jobs, query])

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
      await messagesApi.sendMessage(conv.id, {
        content: `Hi! I applied to your "${job.title}" position. I'd love to discuss the opportunity.`,
      })
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(job.salonName)}` as never)
    } catch (e: unknown) {
      const msg = parseApiError(e)
      Alert.alert(msg.toLowerCase().includes('already') ? 'Already applied' : 'Application failed', msg)
    } finally {
      setApplyingId(null)
    }
  }, [user])

  const handleMessageWorker = useCallback(async (worker: WorkerCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      router.push('/(auth)/login')
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
  }, [user])

  const handleMessageJob = useCallback(async (job: JobPostCardData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!user) {
      Alert.alert('Sign in required', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ])
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
  }, [user])

  const isLoading = activeTab === 'workers' ? workersLoading : jobsLoading

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top > 0 ? 4 : 12 }]}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss()
            router.back()
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={[styles.inputWrap, { backgroundColor: theme.bg.input }]}>
          <Ionicons name="search" size={18} color={theme.text.tertiary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search workers, jobs, salons…"
            placeholderTextColor={theme.text.tertiary}
            style={[styles.input, { color: theme.text.primary }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented control */}
      <View style={[styles.segmentRow, { borderBottomColor: theme.border.subtle }]}>
        {(['workers', 'jobs'] as Tab[]).map((tab) => {
          const active = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setActiveTab(tab)
              }}
              style={[styles.segmentTab, active && { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 }]}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? theme.brand.primary : theme.text.tertiary }}>
                {tab === 'workers' ? 'Workers' : 'Jobs'}
              </Text>
              {!isLoading && (
                <View style={[styles.countBadge, { backgroundColor: active ? theme.brand.primary : theme.bg.elevated }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : theme.text.tertiary }}>
                    {tab === 'workers' ? filteredWorkers.length : filteredJobs.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Results */}
      {activeTab === 'workers' ? (
        <FlatList<WorkerCardData>
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const uid = item.userId
            const ss = uid ? storyMap.get(uid) : undefined
            const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
            return (
              <WorkerCard
                worker={item}
                onPress={() => router.push(`/worker/${item.id}`)}
                onMessage={() => void handleMessageWorker(item)}
                storyState={storyState as 'unseen' | 'seen' | 'none'}
                onStoryPress={uid && ss?.hasStory ? () => openViewerForUser(uid) : undefined}
              />
            )
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 80 }]}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 8, paddingTop: 8 }}>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => <WorkerCardSkeleton key={i} />)}
              </View>
            ) : (
              <EmptyState query={query} label="workers" theme={theme} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList<JobPostCardData>
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const salonUid = item.salonUserId
            const ss = salonUid ? storyMap.get(salonUid) : undefined
            const salonStoryState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
            return (
              <JobPostCard
                job={item}
                onPress={() => router.push(`/jobs/${item.id}`)}
                onApply={!isSalon && applyingId !== item.id ? () => void handleApplyJob(item) : undefined}
                onMessage={messagingId !== item.id ? () => void handleMessageJob(item) : undefined}
                salonStoryState={salonStoryState as 'unseen' | 'seen' | 'none'}
                onSalonStoryPress={salonUid && ss?.hasStory ? () => openViewerForUser(salonUid) : undefined}
              />
            )
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 80 }]}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 8, paddingTop: 8 }}>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => <JobPostCardSkeleton key={i} />)}
              </View>
            ) : (
              <EmptyState query={query} label="jobs" theme={theme} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

function EmptyState({ query, label, theme }: { query: string; label: string; theme: any }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={theme.text.tertiary} />
      <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary, textAlign: 'center' }}>
        {query.trim().length > 0 ? `No ${label} found` : `Search for ${label}`}
      </Text>
      <Text style={{ fontSize: 14, color: theme.text.tertiary, textAlign: 'center', paddingHorizontal: 32 }}>
        {query.trim().length > 0
          ? `Try a different search term`
          : `Type a name, specialty, or location to get started`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  segmentRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  list: { paddingTop: 8 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
})
