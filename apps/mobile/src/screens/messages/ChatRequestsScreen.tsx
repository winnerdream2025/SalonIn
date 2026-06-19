import React, { useCallback } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, Avatar } from '@salonin/ui'
import type { ChatRequestPreview } from '@salonin/types'
import { useChatRequests } from '../../hooks/useChatRequests'

export default function ChatRequestsScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { requests, isLoading, isRefreshing, error, refresh, respond } = useChatRequests()

  const handleAccept = useCallback(
    async (req: ChatRequestPreview) => {
      const updated = await respond(req.id, 'ACCEPT')
      if (updated.conversationId) {
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: updated.conversationId,
            name: req.sender.name,
            otherUserId: req.sender.id,
            chatRequestId: req.id,
          },
        })
      }
    },
    [respond],
  )

  const handleDecline = useCallback(
    async (id: string) => {
      await respond(id, 'DECLINE')
    },
    [respond],
  )

  const renderItem = useCallback(
    ({ item }: { item: ChatRequestPreview }) => (
      <View style={[styles.item, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
        <View style={styles.avatarWrap}>
          <Avatar uri={item.sender.photoUrl} name={item.sender.name} size="md" />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.nameRow}>
            <Text style={[styles.senderName, { color: theme.text.primary }]} numberOfLines={1}>
              {item.sender.name}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.bg.elevated }]}>
              <Text style={[styles.roleText, { color: theme.text.secondary }]}>
                {item.sender.role === 'WORKER' ? 'Pro' : 'Salon'}
              </Text>
            </View>
          </View>
          <Text style={[styles.preview, { color: theme.text.secondary }]} numberOfLines={1}>
            Wants to connect with you
          </Text>
          <Text style={[styles.time, { color: theme.text.secondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#D85A30' }]}
              onPress={() => void handleAccept(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.acceptText, { color: theme.text.inverse }]}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: theme.border.subtle }]}
              onPress={() => void handleDecline(item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.declineText, { color: theme.text.secondary }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [theme, handleAccept, handleDecline],
  )

  if (error != null) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Something went wrong</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
            Failed to load requests
          </Text>
          <TouchableOpacity
            onPress={() => void refresh()}
            style={{ marginTop: 16, backgroundColor: '#D85A30', borderRadius: 22, paddingHorizontal: 20, height: 44, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.brand.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Chat Requests</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={isLoading ? [] : requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isRefreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.bg.elevated }]}>
                <Text style={{ fontSize: 28 }}>✉️</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                No pending requests
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
                When someone wants to chat, you’ll see them here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  list: { flexGrow: 1 },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { marginRight: 12, marginTop: 2 },
  itemContent: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  senderName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  preview: { fontSize: 13, lineHeight: 18, marginBottom: 2 },
  time: { fontSize: 11, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontSize: 15, fontWeight: '700' },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineText: { fontSize: 15, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
})
