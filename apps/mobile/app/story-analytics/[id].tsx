import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { storiesApi } from '@salonin/api-client'
import type { StoryAnalytics, StoryUser } from '@salonin/api-client'

function userName(u: StoryUser) {
  return u.workerProfile?.name ?? u.salonProfile?.name ?? 'Unknown'
}

function userPhoto(u: StoryUser): string | null {
  return u.workerProfile?.photoUrl ?? u.salonProfile?.photoUrls[0] ?? null
}

function Avatar({ user, size = 40 }: { user: StoryUser; size?: number }) {
  const photo = userPhoto(user)
  const name = userName(user)
  return photo ? (
    <Image
      source={{ uri: photo }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#aaa', fontSize: size * 0.4, fontWeight: '700' }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function StoryAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useTheme()
  const [data, setData] = useState<StoryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<'viewers' | 'likes' | 'replies'>('viewers')

  useEffect(() => {
    if (!id) return
    storiesApi
      .getAnalytics(id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const metrics = data
    ? [
        { label: 'Views', value: data.totalViews, icon: 'eye-outline' as const },
        { label: 'Likes', value: data.totalLikes, icon: 'heart-outline' as const },
        { label: 'Replies', value: data.totalReplies, icon: 'chatbubble-outline' as const },
      ]
    : []

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Story Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={{ color: theme.text.secondary }}>Failed to load analytics.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.brand.primary, fontWeight: '600' }}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Metric cards */}
          <View style={styles.metricsRow}>
            {metrics.map((m) => (
              <View
                key={m.label}
                style={[styles.metricCard, { backgroundColor: theme.bg.elevated }]}
              >
                <Ionicons name={m.icon} size={22} color={theme.brand.primary} />
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border.subtle }]}>
            {(['viewers', 'likes', 'replies'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabBtn, tab === t && { borderBottomColor: theme.brand.primary, borderBottomWidth: 2 }]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: tab === t ? theme.text.primary : theme.text.secondary },
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {tab === 'viewers' && (
            <FlatList
              data={data.viewers}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={[styles.listItem, { borderBottomColor: theme.border.subtle }]}>
                  <Avatar user={item.viewer} />
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemName, { color: theme.text.primary }]}>
                      {userName(item.viewer)}
                    </Text>
                    <Text style={[styles.listItemSub, { color: theme.text.tertiary }]}>
                      Viewed {timeAgo(item.viewedAt)}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.text.secondary }]}>No views yet</Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}

          {tab === 'likes' && (
            <FlatList
              data={data.likes}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={[styles.listItem, { borderBottomColor: theme.border.subtle }]}>
                  <Avatar user={item.user} />
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemName, { color: theme.text.primary }]}>
                      {userName(item.user)}
                    </Text>
                    <Text style={[styles.listItemSub, { color: theme.text.tertiary }]}>
                      Liked {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                  <Ionicons name="heart" size={16} color="#FF3B6F" />
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.text.secondary }]}>No likes yet</Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}

          {tab === 'replies' && (
            <FlatList
              data={data.replies}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.listItem, { borderBottomColor: theme.border.subtle }]}>
                  <Avatar user={item.user} />
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemName, { color: theme.text.primary }]}>
                      {userName(item.user)}
                    </Text>
                    <Text style={[styles.listItemSub, { color: theme.text.secondary }]} numberOfLines={2}>
                      {item.content}
                    </Text>
                    <Text style={[styles.listItemSub, { color: theme.text.tertiary, marginTop: 2 }]}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.text.secondary }]}>No replies yet</Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: { fontSize: 24, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingBottom: 40 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemText: { flex: 1, gap: 2 },
  listItemName: { fontSize: 14, fontWeight: '600' },
  listItemSub: { fontSize: 12 },
  empty: { textAlign: 'center', paddingTop: 48, fontSize: 15 },
})
