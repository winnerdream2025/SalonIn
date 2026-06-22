import React, { memo, useRef } from 'react'
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import type { ConversationPreview } from '@salonin/types'
import { getAvatarGradient, formatLastSeen } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

export interface ConversationItemProps {
  conversation: ConversationPreview
  onPress: () => void
  onLongPress?: () => void
  onArchive?: () => void
  onDelete?: () => void
  isSelected?: boolean
  /** Story ring state for the other participant's avatar */
  storyState?: 'unseen' | 'seen' | 'none'
  /** Called when the user taps the avatar ring */
  onStoryPress?: () => void
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

const RING = 2
const GAP = 2
const AVATAR_D = 50
const RING_D = AVATAR_D + (RING + GAP) * 2
const ACTION_WIDTH = 72  // width of each swipe action button
const REVEAL_THRESHOLD = 40  // px dragged before we snap open
const SNAP_OPEN = ACTION_WIDTH * 2  // total reveal distance

function ConversationItemImpl({
  conversation,
  onPress,
  onLongPress,
  onArchive,
  onDelete,
  isSelected,
  storyState = 'none',
  onStoryPress,
}: ConversationItemProps) {
  const { theme } = useTheme()
  const { otherParticipant, lastMessage, unreadCount, isPinned, isMuted } = conversation
  const [avatarBg] = getAvatarGradient(otherParticipant.name)
  const initial = otherParticipant.name[0]?.toUpperCase() ?? '?'
  const isOnline = otherParticipant.presence?.isOnline ?? false

  const lastText =
    lastMessage?.content ??
    (lastMessage?.mediaUrl != null ? 'Photo' : 'Start the conversation')

  const hasRing = storyState !== 'none'
  const ringColor = storyState === 'unseen' ? '#D85A30' : '#666'

  // ── Swipe gesture ────────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current
  const currentX = useRef(0)
  const isOpen = useRef(false)

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start()
    isOpen.current = false
    currentX.current = 0
  }

  const open = () => {
    Animated.spring(translateX, { toValue: -SNAP_OPEN, useNativeDriver: true, tension: 80, friction: 12 }).start()
    isOpen.current = true
    currentX.current = -SNAP_OPEN
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateX.setOffset(currentX.current)
        translateX.setValue(0)
      },
      onPanResponderMove: (_, g) => {
        const val = Math.min(0, Math.max(-SNAP_OPEN, g.dx))
        translateX.setValue(val)
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset()
        const current = currentX.current + g.dx
        if (current < -REVEAL_THRESHOLD) {
          open()
        } else {
          close()
        }
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset()
        close()
      },
    }),
  ).current

  // ── Avatar ────────────────────────────────────────────────────────────────
  const avatarInner = (
    <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
      {otherParticipant.photoUrl != null ? (
        <Image source={{ uri: otherParticipant.photoUrl }} style={styles.avatarImg} />
      ) : (
        <Text style={styles.avatarText}>{initial}</Text>
      )}
      {isOnline && <View style={[styles.onlineDot, { borderColor: theme.bg.surface }]} />}
    </View>
  )

  return (
    <View style={styles.swipeWrapper}>
      {/* Swipe action buttons revealed behind */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#E8883A' }]}
          onPress={() => { close(); onArchive?.() }}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionLabel}>Archive</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#E24B4A' }]}
          onPress={() => { close(); onDelete?.() }}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>🗑</Text>
          <Text style={styles.actionLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable row */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[
            styles.container,
            {
              backgroundColor: theme.bg.surface,
              borderLeftColor: isSelected ? theme.brand.primary : 'transparent',
            },
          ]}
          onPress={() => { if (isOpen.current) { close() } else { onPress() } }}
          onLongPress={onLongPress}
          activeOpacity={0.8}
        >
          {hasRing ? (
            <TouchableOpacity
              onPress={onStoryPress}
              activeOpacity={0.8}
              style={[
                styles.ring,
                { borderColor: ringColor, width: RING_D, height: RING_D, borderRadius: RING_D / 2 },
              ]}
            >
              {avatarInner}
            </TouchableOpacity>
          ) : (
            avatarInner
          )}

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
                  <Text style={[styles.time, { color: unreadCount > 0 ? theme.brand.primary : theme.text.secondary }]} numberOfLines={1}>
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
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : isMuted ? null : (
                <View style={[styles.cameraBtn, { backgroundColor: theme.bg.elevated }]}>
                  <Text style={{ fontSize: 13 }}>📷</Text>
                </View>
              )}
            </View>
            {!isOnline && otherParticipant.presence?.lastSeenAt != null && (
              <Text style={[styles.lastSeen, { color: theme.text.tertiary }]}>
                {formatLastSeen(otherParticipant.presence.lastSeenAt)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

export const ConversationItem = memo(ConversationItemImpl)

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
  swipeWrapper: {
    overflow: 'hidden',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#fff' },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderLeftWidth: 3,
  },
  ring: {
    borderWidth: RING,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: AVATAR_D,
    height: AVATAR_D,
    borderRadius: AVATAR_D / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: AVATAR_D, height: AVATAR_D },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ECC71',
    borderWidth: 2,
    borderColor: '#fff',
  },

  info: { flex: 1, minWidth: 0, gap: 3 },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
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
  lastSeen: { fontSize: 11, marginTop: 2 },

  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  cameraBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
