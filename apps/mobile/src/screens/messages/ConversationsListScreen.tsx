import React, { useCallback } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, ConversationItem, ConversationItemSkeleton } from '@salonin/ui'
import type { ConversationPreview } from '@salonin/types'
import { useConversations } from '../../hooks/useConversations'
import { useChatRequests } from '../../hooks/useChatRequests'

const SKELETON_COUNT = 6

export default function ConversationsListScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { conversations, isLoading, isRefreshing, error, refresh } = useConversations()
  const { pendingCount } = useChatRequests()

  const handlePress = useCallback((conv: ConversationPreview) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: conv.id, name: conv.otherParticipant.name, otherUserId: conv.otherParticipant.userId },
    })
  }, [])

  if (error != null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.text.secondary }]}>
            Failed to load conversations
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Messages</Text>
        <TouchableOpacity
          onPress={() => router.push('/chat-requests' as Parameters<typeof router.push>[0])}
          style={[styles.requestsBtn, { backgroundColor: theme.bg.elevated }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.requestsBtnText, { color: theme.text.primary }]}>Requests</Text>
          {pendingCount > 0 && (
            <View style={[styles.requestsBadge, { backgroundColor: theme.brand.primary }]}>
              <Text style={[styles.requestsBadgeText, { color: theme.text.inverse }]}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={isLoading ? [] : conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem conversation={item} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <ConversationItemSkeleton key={i} />
              ))}
            </>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.bg.elevated }]}>
                <Text style={styles.emptyEmoji}>💬</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
                Start a chat by visiting a worker or salon profile.
              </Text>
            </View>
          )
        }
        refreshing={isRefreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={[styles.list, { paddingBottom: 56 + bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border.default }]} />
        )}
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
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  requestsBtnText: { fontSize: 13, fontWeight: '600' },
  requestsBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  requestsBadgeText: { fontSize: 10, fontWeight: '700' },
  list: { flexGrow: 1 },
  separator: { height: 1, marginLeft: 72 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
})
