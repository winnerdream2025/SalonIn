import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, ConversationItem, ConversationItemSkeleton, Text } from '@salonin/ui'
import type { ConversationPreview } from '@salonin/types'
import { useConversations } from '../../hooks/useConversations'
import { useChatRequests } from '../../hooks/useChatRequests'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'
import { useAuthStore } from '../../store/authStore'
import { StoriesBar } from '../../components/StoriesBar'
import { useStories } from '../../contexts/StoriesContext'
import type { UserStoryState } from '../../contexts/StoriesContext'

const SKELETON_COUNT = 6

// ─── Tabs ────────────────────────────────────────────────────────────────────

type InboxTab = 'Main' | 'Requests' | 'Unread' | 'Starred' | 'Archived'
const TABS: InboxTab[] = ['Main', 'Requests', 'Unread', 'Starred', 'Archived']

// ─── Notification row types shown at top of Main tab ─────────────────────────

interface NotifAggregator {
  id: string
  title: string
  subtitle: string
  iconBg: string
  iconName: keyof typeof Ionicons.glyphMap
  iconColor: string
  badgeCount: number
  onPress: () => void
}

// ─── Pill Tab Bar ─────────────────────────────────────────────────────────────

const PillTabBar = React.memo(function PillTabBar({
  activeTab,
  onSelect,
  mainCount,
  unreadCount,
  requestCount,
  archivedCount,
}: {
  activeTab: InboxTab
  onSelect: (t: InboxTab) => void
  mainCount: number
  unreadCount: number
  requestCount: number
  archivedCount: number
}) {
  const { theme } = useTheme()

  const label = (tab: InboxTab): string => {
    switch (tab) {
      case 'Main':
        return mainCount > 0 ? `Main ${mainCount > 99 ? '99+' : mainCount}` : 'Main'
      case 'Requests':
        return requestCount > 0 ? `Requests ${requestCount}` : 'Requests'
      case 'Unread':
        return unreadCount > 0 ? `Unread ${unreadCount > 99 ? '99+' : unreadCount}` : 'Unread'
      case 'Starred':
        return 'Starred'
      case 'Archived':
        return archivedCount > 0 ? `Archived ${archivedCount}` : 'Archived'
    }
  }

  return (
    <View style={styles.pillTabRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillTabScroll}
      >
        {TABS.map((tab) => {
          const active = tab === activeTab
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onSelect(tab)}
              activeOpacity={0.75}
              style={[
                styles.pillTab,
                active
                  ? { backgroundColor: theme.brand.primary }
                  : { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.pillTabText,
                  { color: active ? '#fff' : theme.text.secondary },
                ]}
              >
                {label(tab)}
              </Text>
              {tab === 'Requests' && (
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={active ? '#fff' : theme.text.tertiary}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
})

// ─── Notification Aggregator Row ──────────────────────────────────────────────

const NotifAggRow = React.memo(function NotifAggRow({ item }: { item: NotifAggregator }) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity
      style={[styles.notifRow, { backgroundColor: theme.bg.surface }]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.notifIconWrap, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.iconName} size={22} color={item.iconColor} />
      </View>
      <View style={styles.notifInfo}>
        <Text style={[styles.notifTitle, { color: theme.text.primary }]}>{item.title}</Text>
        <Text style={[styles.notifSub, { color: theme.text.secondary }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {item.badgeCount > 0 && (
        <View style={[styles.notifBadge, { backgroundColor: '#E24B4A' }]}>
          <Text style={styles.notifBadgeText}>
            {item.badgeCount > 99 ? '99+' : item.badgeCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
})

const Separator = React.memo(function Separator() {
  const { theme } = useTheme()
  return <View style={[styles.separator, { backgroundColor: theme.border.subtle }]} />
})

// ─── Conversation row (memoized) ─────────────────────────────────────────────

const ConversationRow = React.memo(function ConversationRow({
  item,
  storyMap,
  onPress,
  onLongPress,
  onArchive,
  onDelete,
  onStoryPress,
}: {
  item: ConversationPreview
  storyMap: Map<string, UserStoryState>
  onPress: (conv: ConversationPreview) => void
  onLongPress: (conv: ConversationPreview) => void
  onArchive: (conv: ConversationPreview) => void
  onDelete: (conv: ConversationPreview) => void
  onStoryPress: (userId: string) => void
}) {
  const uid = item.otherParticipant.userId
  const ss = storyMap.get(uid)
  const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
  return (
    <ConversationItem
      conversation={item}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      onArchive={() => onArchive(item)}
      onDelete={() => onDelete(item)}
      storyState={storyState as 'unseen' | 'seen' | 'none'}
      onStoryPress={ss?.hasStory ? () => onStoryPress(uid) : undefined}
    />
  )
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConversationsListScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<InboxTab>('Main')
  const [search, setSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const {
    conversations,
    isLoading,
    isRefreshing,
    error,
    refresh,
    pinConversation,
    archiveConversation,
    muteConversation,
    deleteConversation,
  } = useConversations(search.trim())
  const { pendingCount } = useChatRequests()
  const { unreadCount: notifUnread, notifications } = useNotificationCenter()
  const { openViewerForUser, storyMap } = useStories()
  const currentUser = useAuthStore((s) => s.user)

  // ── Derived counts ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'Archived') return conversations.filter((c) => c.isArchived)
    const base = conversations.filter((c) => !c.isArchived)
    if (activeTab === 'Main') return base
    if (activeTab === 'Unread') return base.filter((c) => c.unreadCount > 0)
    if (activeTab === 'Starred') return base.filter((c) => c.isPinned)
    return [] // Requests handled separately
  }, [conversations, activeTab])

  const mainCount = useMemo(
    () => conversations.filter((c) => !c.isArchived).length + notifUnread,
    [conversations, notifUnread],
  )
  const archivedCount = useMemo(
    () => conversations.filter((c) => c.isArchived).length,
    [conversations],
  )
  const unreadConvCount = useMemo(
    () => conversations.filter((c) => !c.isArchived && c.unreadCount > 0).length,
    [conversations],
  )

  // ── Notification aggregators ───────────────────────────────────────────────
  const followerNotifs = useMemo(
    () => notifications.filter((n) => n.type === 'NEW_FOLLOWER' || n.type === 'FOLLOW'),
    [notifications],
  )
  const activityNotifs = useMemo(
    () => notifications.filter((n) => ['REVIEW_RECEIVED', 'NEW_JOB_MATCH', 'APPLICATION_ACCEPTED', 'APPLICATION_DECLINED'].includes(n.type)),
    [notifications],
  )
  const systemNotifs = useMemo(
    () => notifications.filter((n) => ['SYSTEM', 'NEW_APPLICATION'].includes(n.type)),
    [notifications],
  )

  const aggregators: NotifAggregator[] = useMemo(
    () => [
      {
        id: 'followers',
        title: 'New followers',
        subtitle:
          followerNotifs.length > 0
            ? followerNotifs[0]!.body
            : 'No new followers yet',
        iconBg: '#378ADD',
        iconName: 'people',
        iconColor: '#fff',
        badgeCount: followerNotifs.filter((n) => !n.isRead).length,
        onPress: () => router.push({ pathname: '/follow/followers', params: { userId: currentUser?.id ?? '', name: 'My' } } as never),
      },
      {
        id: 'activity',
        title: 'Activity',
        subtitle:
          activityNotifs.length > 0
            ? activityNotifs[0]!.body
            : 'Reviews, job matches & more',
        iconBg: '#E24B4A',
        iconName: 'heart',
        iconColor: '#fff',
        badgeCount: activityNotifs.filter((n) => !n.isRead).length,
        onPress: () => router.push('/notifications' as Parameters<typeof router.push>[0]),
      },
      {
        id: 'system',
        title: 'System notifications',
        subtitle:
          systemNotifs.length > 0
            ? systemNotifs[0]!.body
            : 'App updates and alerts',
        iconBg: '#1C1C1E',
        iconName: 'notifications',
        iconColor: '#fff',
        badgeCount: systemNotifs.filter((n) => !n.isRead).length,
        onPress: () => router.push('/notifications' as Parameters<typeof router.push>[0]),
      },
    ],
    [followerNotifs, activityNotifs, systemNotifs, currentUser],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePress = useCallback((conv: ConversationPreview) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conv.id,
        name: conv.otherParticipant.name,
        otherUserId: conv.otherParticipant.userId,
        otherPhotoUrl: conv.otherParticipant.photoUrl ?? '',
      },
    })
  }, [])

  const showActions = useCallback(
    (conv: ConversationPreview) => {
      const options = [
        {
          text: conv.isPinned ? 'Unpin' : 'Pin',
          onPress: () => void pinConversation(conv.id, !conv.isPinned),
        },
        {
          text: conv.isMuted ? 'Unmute' : 'Mute',
          onPress: () => void muteConversation(conv.id, !conv.isMuted),
        },
        {
          text: conv.isArchived ? 'Unarchive' : 'Archive',
          onPress: () => void archiveConversation(conv.id, !conv.isArchived),
        },
        {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert('Delete conversation?', 'This will remove it from your inbox.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void deleteConversation(conv.id) },
            ])
          },
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
      Alert.alert(conv.otherParticipant.name, undefined, options)
    },
    [pinConversation, archiveConversation, muteConversation, deleteConversation],
  )

  const handleArchive = useCallback(
    (conv: ConversationPreview) => void archiveConversation(conv.id, !conv.isArchived),
    [archiveConversation],
  )

  const handleDelete = useCallback((conv: ConversationPreview) => {
    Alert.alert('Delete conversation?', 'This will remove it from your inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteConversation(conv.id) },
    ])
  }, [deleteConversation])

  const handleStoryPress = useCallback((userId: string) => openViewerForUser(userId), [openViewerForUser])

  const renderItem = useCallback(
    ({ item }: { item: ConversationPreview }) => (
      <ConversationRow
        item={item}
        storyMap={storyMap}
        onPress={handlePress}
        onLongPress={showActions}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onStoryPress={handleStoryPress}
      />
    ),
    [storyMap, handlePress, showActions, handleArchive, handleDelete, handleStoryPress],
  )

  const convKeyExtractor = useCallback((item: ConversationPreview) => item.id, [])

  const listEmpty = useMemo(
    () =>
      isLoading ? (
        <>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ConversationItemSkeleton key={i} />
          ))}
        </>
      ) : error != null ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBox, { backgroundColor: theme.bg.elevated }]}>
            <Ionicons name="wifi-outline" size={26} color={theme.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Couldn't load messages</Text>
          <Text style={[styles.emptySub, { color: theme.text.secondary }]}>Check your connection and try again</Text>
          <TouchableOpacity
            onPress={() => void refresh()}
            style={[styles.retryBtn, { backgroundColor: theme.brand.primary }]}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(216,90,48,0.08)' }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={theme.brand.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
            {activeTab === 'Starred'
              ? 'No starred chats'
              : activeTab === 'Unread'
                ? "You're all caught up"
                : activeTab === 'Archived'
                  ? 'No archived chats'
                  : search.length > 0
                    ? 'No matches found'
                    : 'No conversations yet'}
          </Text>
          <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
            {activeTab === 'Starred'
              ? 'Pin conversations to star them'
              : activeTab === 'Unread'
                ? 'All messages are read'
                : activeTab === 'Archived'
                  ? 'Archived chats will appear here'
                  : search.length > 0
                    ? 'Try a different search term'
                    : 'Visit a worker or salon profile\nto start a conversation'}
          </Text>
        </View>
      ),
    [isLoading, error, activeTab, search, theme, refresh],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <>
        <StoriesBar />
        {activeTab === 'Main' && (
          <View style={[styles.aggregatorSection, { borderBottomColor: theme.border.subtle }]}>
            {aggregators.map((agg) => (
              <NotifAggRow key={agg.id} item={agg} />
            ))}
            <View style={[styles.aggDivider, { backgroundColor: theme.border.subtle }]} />
          </View>
        )}
      </>
    ),
    [activeTab, aggregators, theme],
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text
          style={[styles.titleText, { color: theme.text.primary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          Inbox
        </Text>

        <TouchableOpacity
          onPress={() => setIsSearching((s) => !s)}
          style={[styles.iconBtn, { backgroundColor: theme.bg.elevated }]}
          activeOpacity={0.8}
        >
          <Ionicons name={isSearching ? 'close' : 'search'} size={18} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      {isSearching && (
        <View style={[styles.searchWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
          <Ionicons name="search" size={15} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search conversations…"
            placeholderTextColor={theme.text.tertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Pill tabs ── */}
      <PillTabBar
        activeTab={activeTab}
        onSelect={(t) => {
          if (t === 'Requests') {
            router.push('/chat-requests' as Parameters<typeof router.push>[0])
          } else {
            setActiveTab(t)
          }
        }}
        mainCount={mainCount}
        unreadCount={unreadConvCount}
        requestCount={pendingCount}
        archivedCount={archivedCount}
      />

      {/* ── List ── */}
      <FlatList
        ListHeaderComponent={ListHeader}
        data={isLoading ? [] : filtered}
        keyExtractor={convKeyExtractor}
        renderItem={renderItem}
        refreshing={isRefreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={[styles.list, { paddingBottom: 52 + bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={listEmpty}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titleText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 42,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Pill tabs
  pillTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillTabScroll: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillTabText: { fontSize: 13, fontWeight: '700' },


  // Notification aggregator rows
  aggregatorSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aggDivider: { height: StyleSheet.hairlineWidth },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
  },
  notifIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifInfo: { flex: 1, minWidth: 0, gap: 3 },
  notifTitle: { fontSize: 15, fontWeight: '700' },
  notifSub: { fontSize: 13 },
  notifBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // List
  list: { flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 78 },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 22,
  },
})
