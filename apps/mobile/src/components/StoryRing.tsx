/**
 * StoryRing — wraps any child (Avatar, Image, etc.) with a WhatsApp-style
 * gradient ring when a user has an active story. Tapping the ring opens
 * the global StoryViewer via StoriesContext.
 *
 * Usage:
 *   <StoryRing userId={worker.userId} size={50}>
 *     <Avatar uri={worker.photoUrl} name={worker.name} />
 *   </StoryRing>
 */
import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useStories } from '../contexts/StoriesContext'

const UNSEEN_COLOR = '#D85A30'
const SEEN_COLOR = '#888'
const RING = 2.5
const GAP = 2.5

interface Props {
  userId: string | undefined
  /** Outer diameter of the inner avatar/child content */
  size: number
  children: React.ReactNode
  /** Override press handler — defaults to openViewerForUser */
  onPress?: () => void
  disabled?: boolean
}

export function StoryRing({ userId, size, children, onPress, disabled }: Props) {
  const { storyMap, openViewerForUser } = useStories()

  const state = userId ? storyMap.get(userId) : undefined
  const hasStory = Boolean(state?.hasStory)
  const hasUnseen = Boolean(state?.hasUnseen)

  const handlePress = onPress ?? (() => {
    if (userId && hasStory) openViewerForUser(userId)
  })

  const ringSize = size + (RING + GAP) * 2

  if (!hasStory || disabled) {
    // No ring — render children as-is in a plain View with the same footprint
    return (
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    )
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: hasUnseen ? UNSEEN_COLOR : SEEN_COLOR,
        },
      ]}
    >
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
