import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import type { Message } from '@salonin/types'
import { getAvatarGradient } from '@salonin/utils'
import { Skeleton } from '../primitives/Skeleton'
import { useTheme } from '../hooks/useTheme'

export interface MessageBubbleProps {
  message: Message
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
  const time = new Date(message.createdAt as unknown as string).toLocaleTimeString('en-US', {
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
            ? [styles.bubbleSelf, { backgroundColor: theme.brand.primary }]
            : [styles.bubbleOther, { backgroundColor: theme.bg.elevated }],
        ]}
      >
        {message.mediaUrl != null && (
          <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="cover" />
        )}
        {message.content != null && message.content.length > 0 && (
          <Text style={[styles.content, { color: theme.text.primary }]}>{message.content}</Text>
        )}
        <Text style={[styles.time, isSelf ? styles.timeSelf : styles.timeOther]}>{time}</Text>
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
      <Skeleton width={isSelf ? 200 : 160} height={40} radius={16} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: 16,
    gap: 6,
  },
  containerSelf: { justifyContent: 'flex-end' },
  containerOther: { justifyContent: 'flex-start' },

  avatarSlot: { width: 28 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 28, height: 28 },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatarPlaceholder: { width: 28, height: 28 },

  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  bubbleSelf: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },

  media: { width: 200, height: 160, borderRadius: 10, marginBottom: 4 },

  content: { fontSize: 14, lineHeight: 20 },

  time: { fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  timeSelf: { color: 'rgba(255,255,255,0.6)' },
  timeOther: { color: '#555' },
})
