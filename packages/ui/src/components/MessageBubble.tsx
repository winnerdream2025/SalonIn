import React, { useMemo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Message } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'
import { MessageStatusIcon } from './MessageStatusIcon'

type MessageWithStringDate = Omit<Message, 'createdAt'> & { createdAt: Date | string }

export interface MessageBubbleProps {
  message: MessageWithStringDate
  isSelf: boolean
  showAvatar?: boolean
  senderName?: string
  senderPhotoUrl?: string | null
  currentUserId?: string
  onLongPress?: (message: MessageWithStringDate) => void
  onPressReply?: (message: MessageWithStringDate) => void
  onPressReaction?: (emoji: string) => void
}

export function MessageBubble({
  message,
  isSelf,
  showAvatar = false,
  senderName,
  senderPhotoUrl,
  currentUserId,
  onLongPress,
  onPressReply,
  onPressReaction,
}: MessageBubbleProps) {
  const { theme } = useTheme()
  const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const [avatarBg] = getAvatarGradient(senderName ?? '?')
  const initial = (senderName ?? '?')[0]?.toUpperCase() ?? '?'

  const isDeleted = message.isDeletedForAll
  const reactions = message.reactions ?? []
  const groupedReactions = useMemo(() => {
    const map = new Map<string, { count: number; users: string[]; includesMe: boolean }>()
    reactions.forEach((r) => {
      const existing = map.get(r.emoji)
      if (existing) {
        existing.count += 1
        existing.users.push(r.userId)
        if (r.userId === currentUserId) existing.includesMe = true
      } else {
        map.set(r.emoji, {
          count: 1,
          users: [r.userId],
          includesMe: r.userId === currentUserId,
        })
      }
    })
    return Array.from(map.entries())
  }, [reactions, currentUserId])

  const handleReaction = (emoji: string) => {
    onPressReaction?.(emoji)
  }

  const replyTo = message.replyTo
  const hasReply = replyTo != null && replyTo.id != null

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        isSelf
          ? [styles.bubbleSelf, { backgroundColor: isDeleted ? theme.bg.elevated : '#D85A30' }]
          : [styles.bubbleOther, { backgroundColor: isDeleted ? theme.bg.elevated : theme.bg.card }],
        isDeleted && { opacity: 0.7 },
      ]}
    >
      {hasReply && (
        <Pressable
          onPress={() => onPressReply?.(message)}
          style={[
            styles.replyPreview,
            { borderLeftColor: isSelf ? 'rgba(255,255,255,0.5)' : theme.brand.primary },
          ]}
        >
          <Text style={[styles.replySender, { color: isSelf ? 'rgba(255,255,255,0.85)' : theme.brand.primary }]}>
            {replyTo?.senderId === currentUserId ? 'You' : senderName ?? 'User'}
          </Text>
          <Text
            style={[styles.replyText, { color: isSelf ? 'rgba(255,255,255,0.75)' : theme.text.secondary }]}
            numberOfLines={2}
          >
            {replyTo?.isDeletedForAll ? 'Deleted message' : replyTo?.content ?? 'Media'}
          </Text>
        </Pressable>
      )}
      {message.mediaUrl != null && !isDeleted && (
        <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="cover" />
      )}
      {isDeleted ? (
        <Text style={[styles.content, { color: isSelf ? 'rgba(255,255,255,0.65)' : theme.text.secondary, fontStyle: 'italic' }]}>
          This message was deleted
        </Text>
      ) : (
        message.content != null &&
        message.content.length > 0 && (
          <Text style={[styles.content, { color: isSelf ? '#FFFFFF' : theme.text.primary }]}>
            {message.content}
          </Text>
        )
      )}
      <View style={styles.metaRow}>
        <Text style={[styles.time, { color: isSelf ? 'rgba(255,255,255,0.65)' : theme.text.tertiary }]}>
          {time}
        </Text>
        {message.isEdited && !isDeleted && (
          <Text style={[styles.edited, { color: isSelf ? 'rgba(255,255,255,0.55)' : theme.text.tertiary }]}>
            Edited
          </Text>
        )}
        {isSelf && !isDeleted && (
          <MessageStatusIcon
            status={message.status ?? 'sent'}
            tint={isSelf ? 'rgba(255,255,255,0.65)' : theme.text.tertiary}
          />
        )}
      </View>
    </View>
  )

  return (
    <View style={[styles.container, isSelf ? styles.containerSelf : styles.containerOther]}>
      {!isSelf && (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              {senderPhotoUrl != null ? (
                <Image source={{ uri: senderPhotoUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>
      )}

      <View style={styles.bubbleCol}>
        <Pressable
          onLongPress={() => onLongPress?.(message)}
          delayLongPress={350}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          {bubbleContent}
        </Pressable>
        {groupedReactions.length > 0 && (
          <View style={[styles.reactionsRow, isSelf ? styles.reactionsRowSelf : styles.reactionsRowOther]}>
            {groupedReactions.map(([emoji, data]) => (
              <Pressable
                key={emoji}
                onPress={() => handleReaction(emoji)}
                style={[
                  styles.reactionBadge,
                  {
                    backgroundColor: data.includesMe ? theme.brand.primary : theme.bg.elevated,
                    borderColor: data.includesMe ? theme.brand.primary : theme.border.default,
                  },
                ]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {data.count > 1 && (
                  <Text
                    style={[
                      styles.reactionCount,
                      { color: data.includesMe ? '#FFFFFF' : theme.text.secondary },
                    ]}
                  >
                    {data.count}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export function MessageBubbleSkeleton({ isSelf = false }: { isSelf?: boolean }) {
  return (
    <View
      style={[
        styles.container,
        isSelf ? styles.containerSelf : styles.containerOther,
        { marginVertical: 2 },
      ]}
    >
      <Skeleton width={isSelf ? 200 : 160} height={42} radius={16} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: 14,
    gap: 7,
  },
  containerSelf:  { justifyContent: 'flex-end' },
  containerOther: { justifyContent: 'flex-start' },

  avatarSlot: { width: 30 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 30, height: 30 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatarPlaceholder: { width: 30, height: 30 },

  bubbleCol: { maxWidth: '76%' },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 3,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleSelf:  { borderBottomRightRadius: 5 },
  bubbleOther: { borderBottomLeftRadius: 5 },

  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 4,
    gap: 1,
  },
  replySender: { fontSize: 12, fontWeight: '600' },
  replyText: { fontSize: 13, lineHeight: 18 },

  media: { width: 200, height: 160, maxWidth: '100%', borderRadius: 10, marginBottom: 4 },

  content: { fontSize: 15, lineHeight: 21 },

  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 1, gap: 5 },

  time: { fontSize: 10 },
  edited: { fontSize: 10, fontStyle: 'italic' },

  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsRowSelf: { justifyContent: 'flex-end' },
  reactionsRowOther: { justifyContent: 'flex-start' },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: '600' },
})
