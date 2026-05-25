import React, { useCallback } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, ConversationItem, ConversationItemSkeleton } from '@salonin/ui'
import type { ConversationPreview } from '@salonin/types'
import { useConversations } from '../../hooks/useConversations'

const SKELETON_COUNT = 6

export default function ConversationsListScreen() {
  const { theme } = useTheme()
  const { conversations, isLoading, error, refresh } = useConversations()

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
        refreshing={false}
        onRefresh={() => void refresh()}
        contentContainerStyle={styles.list}
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
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
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
