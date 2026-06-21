import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import type { ConversationPreview } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

export interface ConversationItemProps {
  conversation: ConversationPreview
  onPress: () => void
  onLongPress?: () => void
  isSelected?: boolean
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

function PinIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l-2 6h-4l-1 2h7v10l-2 2v2h6v-2l-2-2V10h7l-1-2h-4l-2-6h-2z"
        fill={color}
      />
    </Svg>
  )
}

function MuteIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v13.5m-6-4.5h2l4-4v8l-4-4H6V9zm14 6l-4-4m0 4l4-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function ConversationItem({
  conversation,
  onPress,
  onLongPress,
  isSelected,
}: ConversationItemProps) {
  const { theme } = useTheme()
  const { otherParticipant, lastMessage, unreadCount, isPinned, isMuted } = conversation
  const [avatarBg] = getAvatarGradient(otherParticipant.name)
  const initial = otherParticipant.name[0]?.toUpperCase() ?? '?'

  const lastText =
    lastMessage?.content ??
    (lastMessage?.mediaUrl != null ? 'Photo' : 'Start the conversation')

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.surface,
          borderLeftColor: isSelected ? theme.brand.primary : 'transparent',
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
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
          <Text
            style={[styles.name, unreadCount > 0 && styles.nameUnread, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {otherParticipant.name}
          </Text>
          <View style={styles.metaRow}>
            {isPinned && (
              <View style={[styles.iconPill, { backgroundColor: 'rgba(216,90,48,0.12)' }]}>
                <PinIcon color={theme.brand.primary} />
              </View>
            )}
            {isMuted && (
              <View style={[styles.iconPill, { backgroundColor: theme.bg.elevated }]}>
                <MuteIcon color={theme.text.secondary} />
              </View>
            )}
            {lastMessage != null && (
              <Text style={[styles.time, { color: theme.text.secondary }]} numberOfLines={1}>
                {formatTime(lastMessage.createdAt)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.previewRow}>
          <Text
            style={[styles.preview, { color: unreadCount > 0 ? theme.text.primary : theme.text.secondary }]}
            numberOfLines={1}
          >
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
      <Skeleton width={50} height={50} radius={25} />
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
    borderLeftWidth: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: 50, height: 50 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  info: { flex: 1, minWidth: 0, gap: 3 },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: 12 },
  iconPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
