import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Avatar, Text, Button, Skeleton, useTheme } from '@salonin/ui'
import { workersApi } from '@salonin/api-client'
import type { JobApplicationWithJob, AppStatus } from '@salonin/types'

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#9A9A9A', bg: 'rgba(154,154,154,0.15)' },
  VIEWED: { label: 'Viewed', color: '#60B4FF', bg: 'rgba(55,138,221,0.15)' },
  ACCEPTED: { label: 'Accepted', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)' },
  DECLINED: { label: 'Declined', color: '#E74C3C', bg: 'rgba(231,76,60,0.15)' },
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const SKELETON_COUNT = 5

export default function MyApplicationsScreen() {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()

  const [applications, setApplications] = useState<JobApplicationWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    try {
      const data = await workersApi.getMyApplications()
      setApplications(data)
    } catch {
      setError('Failed to load applications')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const renderSkeleton = () => (
    <View style={[styles.item, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={styles.itemContent}>
        <Skeleton width={160} height={14} radius={7} />
        <Skeleton width={100} height={12} radius={6} />
      </View>
      <Skeleton width={64} height={24} radius={8} />
    </View>
  )

  const renderItem = ({ item }: { item: JobApplicationWithJob }) => {
    const status = STATUS_CONFIG[item.status]
    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
        onPress={() => router.push(`/jobs/${item.jobId}` as never)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          <Avatar uri={item.job.salon.photoUrls[0] ?? null} name={item.job.salon.name} size="md" />
        </View>
        <View style={styles.itemContent}>
          <Text
            variant="body"
            numberOfLines={1}
            style={{ fontWeight: '600', color: theme.text.primary }}
          >
            {item.job.title}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {item.job.salon.name} · {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text variant="caption" style={{ color: status.color, fontWeight: '600' }}>
            {status.label}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text variant="body" color="brand">‹ Back</Text>
        </TouchableOpacity>
        <Text variant="title" style={styles.headerTitle}>My Applications</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="body" color="secondary">{error}</Text>
          <Button variant="ghost" onPress={() => void load()}>Retry</Button>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isRefreshing}
          onRefresh={() => void load(true)}
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.bg.elevated }]}>
                <Text style={styles.emptyEmoji}>📋</Text>
              </View>
              <Text variant="title" style={{ color: theme.text.primary, marginTop: 12 }}>
                No applications yet
              </Text>
              <Text
                variant="body"
                color="secondary"
                style={{ textAlign: 'center', marginTop: 6, lineHeight: 22 }}
              >
                Browse open positions and apply to salons near you.
              </Text>
              <View style={styles.emptyAction}>
                <Button variant="primary" onPress={() => router.push('/(tabs)/jobs' as never)}>
                  Browse jobs
                </Button>
              </View>
            </View>
          }
        />
      )}
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
  backBtn: { width: 60 },
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  skeletonList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  avatarWrap: { flexShrink: 0 },
  itemContent: { flex: 1, minWidth: 0, gap: 3 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: { fontSize: 28 },
  emptyAction: { marginTop: 20, width: '100%' },
})
