/**
 * StoriesBar — horizontal scroll row of story avatars, WhatsApp-style.
 * Reads from StoriesContext — no local data fetching.
 */
import React, { memo } from 'react'
import {
  ScrollView,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, Text } from '@salonin/ui'
import { useStories } from '../contexts/StoriesContext'
import { useAuthStore } from '../store/authStore'
import type { StoryGroup } from '@salonin/api-client'

const AVATAR_SIZE = 58
const RING = 2.5
const GAP = 2.5
const OUTER = AVATAR_SIZE + (RING + GAP) * 2

// ─── Single avatar bubble ──────────────────────────────────────────────────

function StoryBubble({
  group,
  label,
  isOwn,
  noStory,
  theme,
  onPress,
}: {
  group: StoryGroup | null
  label: string
  isOwn: boolean
  noStory: boolean
  theme: ReturnType<typeof useTheme>['theme']
  onPress: () => void
}) {
  const allSeen = !group?.hasUnseen
  const ringColor = noStory
    ? theme.border.default
    : allSeen
    ? '#666'
    : '#D85A30'

  const photoUrl = group?.photoUrl ?? null
  const initial = label.charAt(0).toUpperCase()

  return (
    <TouchableOpacity style={styles.bubble} onPress={onPress} activeOpacity={0.75}>
      {/* Ring */}
      <View
        style={[
          styles.ring,
          {
            width: OUTER,
            height: OUTER,
            borderRadius: OUTER / 2,
            borderColor: ringColor,
            borderWidth: noStory ? 1 : RING,
            borderStyle: noStory ? 'dashed' : 'solid',
          },
        ]}
      >
        {/* Avatar */}
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                backgroundColor: theme.bg.elevated,
              },
            ]}
          >
            <Text style={{ color: theme.text.secondary, fontSize: 22 }}>{initial}</Text>
          </View>
        )}

        {/* "+" badge for own with no story */}
        {isOwn && noStory && (
          <View style={[styles.addBadge, { backgroundColor: '#D85A30', borderColor: theme.bg.base }]}>
            <Ionicons name="add" size={11} color="#fff" />
          </View>
        )}
      </View>

      <Text style={[styles.label, { color: theme.text.secondary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Bar ──────────────────────────────────────────────────────────────────────

export const StoriesBar = memo(function StoriesBar() {
  const { theme } = useTheme()
  const { user } = useAuthStore()
  const { allGroups, myGroup, isLoading, openViewerForUser, openViewerAtIndex, openCreator } =
    useStories()

  if (!user) return null

  const others = allGroups.filter((g) => g.userId !== user.id)
  const showBar = isLoading || myGroup !== null || others.length > 0

  if (!showBar) return null

  const myLabel = 'My Story'

  return (
    <View style={[styles.container, { borderBottomColor: theme.border.subtle }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Own story bubble always first */}
        <StoryBubble
          group={myGroup}
          label={myLabel}
          isOwn
          noStory={myGroup === null}
          theme={theme}
          onPress={() => {
            if (myGroup) openViewerForUser(user.id)
            else openCreator()
          }}
        />

        {isLoading && !myGroup && others.length === 0 && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={theme.text.tertiary} />
          </View>
        )}

        {others.map((g, i) => (
          <StoryBubble
            key={g.userId}
            group={g}
            label={g.name.split(' ')[0] ?? g.name}
            isOwn={false}
            noStory={false}
            theme={theme}
            onPress={() => {
              const idx = allGroups.findIndex((ag) => ag.userId === g.userId)
              openViewerAtIndex(idx >= 0 ? idx : i)
            }}
          />
        ))}
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    flexDirection: 'row',
  },
  bubble: {
    alignItems: 'center',
    width: OUTER + 8,
    gap: 5,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    width: OUTER + 8,
  },
  loaderWrap: {
    width: OUTER + 8,
    height: OUTER + 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
