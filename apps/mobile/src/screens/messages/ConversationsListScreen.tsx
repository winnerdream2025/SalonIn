import React, { useCallback } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View, Platform } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, ConversationItem, ConversationItemSkeleton, Text } from '@salonin/ui'
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
      params: {
        id: conv.id,
        name: conv.otherParticipant.name,
        otherUserId: conv.otherParticipant.userId,
        otherPhotoUrl: conv.otherParticipant.photoUrl ?? '',
      },
    })
  }, [])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Decorative background accent */}
      <View style={styles.accentWrap} pointerEvents="none">
        <View style={[styles.accentBlob, { backgroundColor: 'rgba(216,90,48,0.09)' }]} />
        <View style={[styles.accentPill, { backgroundColor: 'rgba(216,90,48,0.05)' }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.titleSerif, { color: theme.text.primary }]}>Inbox</Text>
          {!isLoading && conversations.length > 0 && (
            <Text style={[styles.headerSub, { color: theme.text.tertiary }]}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

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

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

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
                <Text style={styles.emptyEmoji}>💬</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No conversations yet</Text>
              <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
                Visit a worker or salon profile{'\n'}to start a conversation
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

  accentWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 220,
    height: 180,
    overflow: 'hidden',
    pointerEvents: 'none',
  } as const,
  accentBlob: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  accentPill: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 120,
    height: 36,
    borderRadius: 22,
    transform: [{ rotate: '-15deg' }],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  titleSerif: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headerSub: { fontSize: 13, marginTop: 2 },

  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
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
