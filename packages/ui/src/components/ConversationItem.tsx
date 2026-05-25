import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { ConversationPreview } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

export interface ConversationItemProps {
  conversation: ConversationPreview
  onPress: () => void
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = diffMs / (1000 * 60 * 60)

  if (diffH < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffH < 48) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { theme } = useTheme()
  const { otherParticipant, lastMessage, unreadCount } = conversation
  const [avatarBg] = getAvatarGradient(otherParticipant.name)
  const initial = otherParticipant.name[0]?.toUpperCase() ?? '?'

  const lastText =
    lastMessage?.content ??
    (lastMessage?.mediaUrl != null ? '📷 Photo' : 'Start the conversation')

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.bg.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        {otherParticipant.photoUrl != null ? (
          <Image source={{ uri: otherParticipant.photoUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{initial}</Text>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={1}>
            {otherParticipant.name}
          </Text>
          {lastMessage != null && (
            <Text style={[styles.time, { color: theme.text.secondary }]}>
              {formatTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.previewRow}>
          <Text style={[styles.preview, { color: theme.text.secondary }]} numberOfLines={1}>
            {lastText}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function ConversationItemSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={[styles.info, { gap: 6 }]}>
        <Skeleton width={120} height={11} radius={6} />
        <Skeleton width={180} height={10} radius={5} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: 44, height: 44 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  info: { flex: 1, gap: 3 },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  time: { fontSize: 11 },

  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { fontSize: 13, flex: 1, marginRight: 6 },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
})
