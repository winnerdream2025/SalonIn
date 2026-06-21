import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
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
}

export function MessageBubble({
  message,
  isSelf,
  showAvatar = false,
  senderName,
  senderPhotoUrl,
}: MessageBubbleProps) {
  const { theme } = useTheme()
  const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const [avatarBg] = getAvatarGradient(senderName ?? '?')
  const initial = (senderName ?? '?')[0]?.toUpperCase() ?? '?'

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

      <View
        style={[
          styles.bubble,
          isSelf
            ? [styles.bubbleSelf, { backgroundColor: '#D85A30' }]
            : [styles.bubbleOther, { backgroundColor: theme.bg.card }],
        ]}
      >
        {message.mediaUrl != null && (
          <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="cover" />
        )}
        {message.content != null && message.content.length > 0 && (
          <Text style={[styles.content, { color: isSelf ? '#FFFFFF' : theme.text.primary }]}>
            {message.content}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: isSelf ? 'rgba(255,255,255,0.65)' : theme.text.tertiary }]}>
            {time}
          </Text>
          {isSelf && (
            <MessageStatusIcon
              status={message.status ?? 'sent'}
              tint={isSelf ? 'rgba(255,255,255,0.65)' : theme.text.tertiary}
            />
          )}
        </View>
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

  bubble: {
    maxWidth: '76%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 3,
    // White card shadow for "other" bubbles
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleSelf:  { borderBottomRightRadius: 5 },
  bubbleOther: { borderBottomLeftRadius: 5 },

  media: { width: 200, height: 160, maxWidth: '100%', borderRadius: 10, marginBottom: 4 },

  content: { fontSize: 15, lineHeight: 21 },

  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 1 },

  time: { fontSize: 10 },
})
