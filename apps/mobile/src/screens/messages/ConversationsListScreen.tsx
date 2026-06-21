import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
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
import { StoriesBar } from '../../components/StoriesBar'
import { useStories } from '../../contexts/StoriesContext'

const SKELETON_COUNT = 6
const TABS = ['All', 'Unread', 'Archived'] as const
type InboxTab = (typeof TABS)[number]

export default function ConversationsListScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<InboxTab>('All')
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
  // Stories context — viewer/creator modals live in StoriesProvider at app root
  const { openViewerForUser, storyMap } = useStories()

  const filtered = useMemo(() => {
    if (activeTab === 'All') return conversations.filter((c) => !c.isArchived)
    if (activeTab === 'Unread') return conversations.filter((c) => !c.isArchived && c.unreadCount > 0)
    return conversations.filter((c) => c.isArchived)
  }, [conversations, activeTab])

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
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => void deleteConversation(conv.id),
              },
            ])
          },
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
      Alert.alert(conv.otherParticipant.name, undefined, options)
    },
    [pinConversation, archiveConversation, muteConversation, deleteConversation],
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={[styles.titleSerif, { color: theme.text.primary }]} numberOfLines={1}>Inbox</Text>
          {!isLoading && filtered.length > 0 && activeTab === 'All' && (
            <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
              {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setIsSearching((s) => !s)}
            style={[styles.iconBtn, { backgroundColor: theme.bg.elevated }]}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={18} color={theme.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/chat-requests' as Parameters<typeof router.push>[0])}
            style={[
              styles.requestsBtn,
              pendingCount > 0
                ? { backgroundColor: '#D85A30' }
                : { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, borderWidth: 1 },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={pendingCount > 0 ? 'people' : 'people-outline'}
              size={15}
              color={pendingCount > 0 ? '#fff' : theme.text.secondary}
            />
            <Text style={[styles.requestsBtnText, { color: pendingCount > 0 ? '#fff' : theme.text.secondary }]}>
              Requests
            </Text>
            {pendingCount > 0 && (
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isSearching && (
        <View style={[styles.searchWrap, { borderBottomColor: theme.border.subtle }]}>
          <Ionicons name="search" size={16} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search by name or message"
            placeholderTextColor={theme.text.tertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border.subtle }]}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab
          const count =
            tab === 'All'
              ? conversations.filter((c) => !c.isArchived).length
              : tab === 'Unread'
                ? conversations.filter((c) => !c.isArchived && c.unreadCount > 0).length
                : conversations.filter((c) => c.isArchived).length
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.text.primary : theme.text.secondary },
                ]}
              >
                {tab}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: theme.bg.elevated }]}>
                  <Text style={[styles.tabBadgeText, { color: theme.text.secondary }]}>{count}</Text>
                </View>
              )}
              {isActive && (
                <View style={[styles.tabIndicator, { backgroundColor: theme.brand.primary }]} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      <FlatList
        ListHeaderComponent={<StoriesBar />}
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const uid = item.otherParticipant.userId
          const ss = storyMap.get(uid)
          const storyState = ss?.hasStory ? (ss.hasUnseen ? 'unseen' : 'seen') : 'none'
          return (
            <ConversationItem
              conversation={item}
              onPress={() => handlePress(item)}
              onLongPress={() => showActions(item)}
              storyState={storyState as 'unseen' | 'seen' | 'none'}
              onStoryPress={ss?.hasStory ? () => openViewerForUser(uid) : undefined}
            />
          )
        }}
        ListEmptyComponent={
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
                {activeTab === 'Archived'
                  ? 'No archived chats'
                  : activeTab === 'Unread'
                    ? 'No unread messages'
                    : search.length > 0
                      ? 'No matches found'
                      : 'No conversations yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
                {activeTab === 'Archived'
                  ? 'Archive conversations to access them later'
                  : activeTab === 'Unread'
                    ? 'You’re all caught up'
                    : search.length > 0
                      ? 'Try a different search term'
                      : 'Visit a worker or salon profile\nto start a conversation'}
              </Text>
            </View>
          )
        }
        refreshing={isRefreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={[styles.list, { paddingBottom: 52 + bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border.subtle }]} />
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  titleWrap: {
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleSerif: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headerSub: { fontSize: 13, marginTop: 2 },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },

  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    flexShrink: 0,  // never compress the requests button
  },
  requestsBtnText: { fontSize: 13, fontWeight: '600' },
  requestsBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  requestsBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  divider: { height: StyleSheet.hairlineWidth },
  list: { flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 72 },

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
  emptyEmoji: { fontSize: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21, color: 'gray' },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 22,
  },
})
