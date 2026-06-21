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
import type { StoryGroup } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

interface Props {
  groups: StoryGroup[]
  myStories: StoryGroup | null
  isLoading: boolean
  onPressGroup: (group: StoryGroup, initialIndex?: number) => void
  onPressAddStory: () => void
}

const AVATAR_SIZE = 62
const RING_WIDTH = 2.5
const RING_GAP = 2

function StoryAvatar({
  group,
  onPress,
  isMine = false,
  showAdd = false,
  theme,
}: {
  group: StoryGroup
  onPress: () => void
  isMine?: boolean
  showAdd?: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const allSeen = !group.hasUnseen
  const ringColor = allSeen ? theme.border.default : '#D85A30'
  const name = isMine ? 'My Story' : group.name.split(' ')[0]

  return (
    <TouchableOpacity style={styles.avatarWrap} onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          styles.ring,
          {
            width: AVATAR_SIZE + (RING_WIDTH + RING_GAP) * 2,
            height: AVATAR_SIZE + (RING_WIDTH + RING_GAP) * 2,
            borderRadius: (AVATAR_SIZE + (RING_WIDTH + RING_GAP) * 2) / 2,
            borderWidth: RING_WIDTH,
            borderColor: showAdd ? theme.border.default : ringColor,
          },
        ]}
      >
        {group.photoUrl ? (
          <Image
            source={{ uri: group.photoUrl }}
            style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              {
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                backgroundColor: theme.bg.elevated,
              },
            ]}
          >
            <Text style={{ fontSize: 22, color: theme.text.secondary }}>
              {group.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {showAdd && (
          <View style={[styles.addBadge, { backgroundColor: '#D85A30' }]}>
            <Ionicons name="add" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text
        style={[styles.label, { color: theme.text.secondary }]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </TouchableOpacity>
  )
}

export const StoriesBar = memo(function StoriesBar({
  groups,
  myStories,
  isLoading,
  onPressGroup,
  onPressAddStory,
}: Props) {
  const { theme } = useTheme()
  const { user } = useAuthStore()

  if (!user) return null
  if (!isLoading && groups.length === 0 && !myStories) return null

  const myGroup: StoryGroup = myStories ?? {
    userId: user.id,
    name: 'My Story',
    photoUrl: null,
    hasUnseen: false,
    stories: [],
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme.border.subtle }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* My Story */}
        <StoryAvatar
          group={myGroup}
          isMine
          showAdd={!myStories}
          onPress={() => myStories ? onPressGroup(myStories) : onPressAddStory()}
          theme={theme}
        />

        {isLoading && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={theme.text.tertiary} />
          </View>
        )}

        {groups.map((g) => (
          <StoryAvatar
            key={g.userId}
            group={g}
            onPress={() => onPressGroup(g)}
            theme={theme}
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
  },
  avatarWrap: {
    alignItems: 'center',
    width: 76,
    gap: 5,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: '#eee',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    width: 70,
  },
  loaderWrap: {
    width: 76,
    height: 76 + 16 + 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
