import React, { useCallback } from 'react'
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import type { NotificationItem } from '@salonin/api-client'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'

const TAB_BAR_HEIGHT = 52

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'NEW_MESSAGE': return 'chatbubble-ellipses-outline'
    case 'NEW_APPLICATION': return 'person-add-outline'
    case 'APPLICATION_ACCEPTED': return 'checkmark-circle-outline'
    case 'APPLICATION_DECLINED': return 'close-circle-outline'
    case 'CHAT_REQUEST': return 'chatbubbles-outline'
    case 'CHAT_REQUEST_ACCEPTED': return 'chatbubbles'
    case 'NEW_JOB_MATCH': return 'briefcase-outline'
    case 'REVIEW_RECEIVED': return 'star-outline'
    case 'NEW_FOLLOWER':
    case 'FOLLOW': return 'person-add-outline'
    case 'SYSTEM': return 'megaphone-outline'
    default: return 'notifications-outline'
  }
}

function typeIconColor(type: string, accent: string, theme: { text: { secondary: string } }): string {
  switch (type) {
    case 'APPLICATION_ACCEPTED': return '#1D9E75'
    case 'APPLICATION_DECLINED': return '#E24B4A'
    case 'NEW_APPLICATION': return accent
    case 'NEW_FOLLOWER':
    case 'FOLLOW': return '#378ADD'
    case 'NEW_MESSAGE':
    case 'CHAT_REQUEST':
    case 'CHAT_REQUEST_ACCEPTED': return '#378ADD'
    case 'NEW_JOB_MATCH': return accent
    case 'REVIEW_RECEIVED': return '#EF9F27'
    default: return theme.text.secondary
  }
}

interface NotifRowProps {
  item: NotificationItem
  onPress: (item: NotificationItem) => void
  onDelete: (id: string) => void
  accent: string
  bgCard: string
  bgUnread: string
  textPrimary: string
  textSecondary: string
  borderDefault: string
}

const NotifRow = React.memo(function NotifRow({
  item,
  onPress,
  onDelete,
  accent,
  bgCard,
  bgUnread,
  textPrimary,
  textSecondary,
  borderDefault,
}: NotifRowProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: item.isRead ? bgCard : bgUnread,
          borderBottomColor: borderDefault,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.isRead ? bgUnread : bgCard }]}>
        <Ionicons
          name={typeIcon(item.type)}
          size={22}
          color={typeIconColor(item.type, accent, { text: { secondary: textSecondary } })}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: textPrimary, fontWeight: item.isRead ? '400' : '700' },
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.time, { color: textSecondary }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.body, { color: textSecondary }]}>
          {item.body}
        </Text>
      </View>

      {!item.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: accent }]} />
      )}

      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onDelete(item.id)
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.35, marginLeft: 8 })}
      >
        <Ionicons name="trash-outline" size={16} color={textSecondary} />
      </Pressable>
    </Pressable>
  )
})

export default function NotificationsScreen() {
  const { bottom, top } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { notifications, unreadCount, loading, hasMore, refresh, loadMore, markRead, markAllRead, remove } =
    useNotificationCenter()

  const accent = '#D85A30'

  const handlePress = useCallback(
    async (item: NotificationItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (!item.isRead) await markRead(item.id)

      const data = (item.data ?? {}) as Record<string, unknown>
      const conversationId = data.conversationId as string | undefined
      const jobId = data.jobId as string | undefined
      const followerId = data.followerId as string | undefined
      const followerRole = data.followerRole as string | undefined

      if (['NEW_FOLLOWER', 'FOLLOW'].includes(item.type) && followerId) {
        if (followerRole === 'SALON') {
          router.push(`/salon/${followerId}` as never)
        } else {
          router.push(`/worker/${followerId}` as never)
        }
      } else if (conversationId && ['NEW_MESSAGE', 'CHAT_REQUEST', 'CHAT_REQUEST_ACCEPTED'].includes(item.type)) {
        router.push(`/chat/${conversationId}` as never)
      } else if (jobId && ['NEW_APPLICATION', 'APPLICATION_ACCEPTED', 'APPLICATION_DECLINED', 'NEW_JOB_MATCH'].includes(item.type)) {
        router.push(`/jobs/${jobId}` as never)
      }
    },
    [markRead],
  )

  const handleMarkAll = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await markAllRead()
  }, [markAllRead])

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotifRow
        item={item}
        onPress={handlePress}
        onDelete={remove}
        accent={accent}
        bgCard={theme.bg.base}
        bgUnread={theme.bg.elevated}
        textPrimary={theme.text.primary}
        textSecondary={theme.text.secondary}
        borderDefault={theme.border.default}
      />
    ),
    [handlePress, remove, theme],
  )

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyWrap}>
        <Ionicons name="notifications-off-outline" size={52} color={theme.text.secondary} />
        <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No notifications yet</Text>
        <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
          When salons message you or post jobs, you'll see it here.
        </Text>
      </View>
    ),
    [theme],
  )

  const ListFooter = useCallback(
    () =>
      hasMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={accent} />
        </View>
      ) : null,
    [hasMore],
  )

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.default }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: accent }]}>
              <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            onPress={handleMarkAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={[styles.markAll, { color: accent }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={loading ? null : ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: TAB_BAR_HEIGHT + bottom + 16 },
          notifications.length === 0 && styles.listGrow,
        ]}
        onEndReached={() => { void loadMore() }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={loading && notifications.length === 0}
            onRefresh={refresh}
            tintColor={accent}
            colors={[accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {loading && notifications.length === 0 && (
        <View style={styles.initialLoader}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  markAll: { fontSize: 13, fontWeight: '600' },
  list: { flexGrow: 1 },
  listGrow: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  title: { flex: 1, fontSize: 14, letterSpacing: -0.1 },
  time: { fontSize: 11, flexShrink: 0 },
  body: { fontSize: 13, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    flexShrink: 0,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  initialLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
