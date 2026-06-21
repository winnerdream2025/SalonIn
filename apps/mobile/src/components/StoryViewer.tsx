import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode } from 'expo-av'
import { Text } from '@salonin/ui'
import { storiesApi } from '@salonin/api-client'
import type { Story, StoryGroup } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

const { width: SW, height: SH } = Dimensions.get('window')
const STORY_DURATION = 5000

interface Props {
  visible: boolean
  groups: StoryGroup[]
  startGroupIndex: number
  onClose: () => void
  onViewed?: (storyId: string) => void
}

function ProgressBars({
  count,
  current,
  progress,
}: {
  count: number
  current: number
  progress: Animated.Value
}) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: '#fff',
                width:
                  i < current
                    ? '100%'
                    : i === current
                    ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : '0%',
              },
            ]}
          />
        </View>
      ))}
    </View>
  )
}

export function StoryViewer({ visible, groups, startGroupIndex, onClose, onViewed }: Props) {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  const [groupIdx, setGroupIdx] = useState(startGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [paused, setPaused] = useState(false)

  const progress = useRef(new Animated.Value(0)).current
  const animRef = useRef<Animated.CompositeAnimation | null>(null)

  const group = groups[groupIdx]
  const story: Story | undefined = group?.stories[storyIdx]

  // Sync initial state when viewer opens or group/story changes
  useEffect(() => {
    if (visible) {
      setGroupIdx(startGroupIndex)
      setStoryIdx(0)
    }
  }, [visible, startGroupIndex])

  const startProgress = useCallback((duration = STORY_DURATION) => {
    progress.setValue(0)
    animRef.current?.stop()
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    })
    animRef.current.start(({ finished }) => {
      if (finished) advance()
    })
  }, [progress])

  const advance = useCallback(() => {
    const g = groups[groupIdx]
    if (!g) return
    if (storyIdx < g.stories.length - 1) {
      setStoryIdx((i) => i + 1)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }, [groups, groupIdx, storyIdx, onClose])

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1)
      const prevGroup = groups[groupIdx - 1]
      setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0)
    }
  }, [groups, groupIdx, storyIdx])

  // Start timer when story changes
  useEffect(() => {
    if (!visible || !story) return
    const isVideo = story.type === 'VIDEO'
    if (!isVideo) startProgress(STORY_DURATION)

    // Mark viewed
    const alreadySeen = story.views.length > 0
    if (!alreadySeen) {
      void storiesApi.viewStory(story.id).catch(() => {})
      onViewed?.(story.id)
    }

    // Sync liked state
    setLiked(story.likes.length > 0)
    setLikeCount(story._count.likes)

    return () => {
      animRef.current?.stop()
    }
  }, [visible, story?.id, groupIdx, storyIdx])

  const handleLike = async () => {
    if (!story) return
    try {
      const { liked: newLiked } = await storiesApi.toggleLike(story.id)
      setLiked(newLiked)
      setLikeCount((c) => c + (newLiked ? 1 : -1))
    } catch {}
  }

  const handleReply = async () => {
    if (!story || !replyText.trim()) return
    try {
      await storiesApi.reply(story.id, replyText.trim())
      setReplyText('')
      setShowReply(false)
    } catch {}
  }

  const handlePauseResume = (pause: boolean) => {
    setPaused(pause)
    if (pause) {
      animRef.current?.stop()
    } else {
      // Resume — we don't track elapsed precisely so just restart
      animRef.current?.start(({ finished }) => { if (finished) advance() })
    }
  }

  if (!visible || !group || !story) return null

  const isMine = story.userId === user?.id
  const authorName = group.name
  const photoUrl = group.photoUrl

  const timeSince = (() => {
    const diff = Date.now() - new Date(story.createdAt).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 0) return `${h}h`
    return `${m}m`
  })()

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Media */}
        {story.type === 'IMAGE' ? (
          <Image
            source={{ uri: story.mediaUrl }}
            style={styles.media}
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: story.mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            isLooping={false}
            onPlaybackStatusUpdate={(s) => {
              if ('didJustFinish' in s && s.didJustFinish) advance()
              if ('durationMillis' in s && s.durationMillis && s.positionMillis != null) {
                progress.setValue(s.positionMillis / s.durationMillis)
              }
            }}
            onLoad={(s) => {
              startProgress('durationMillis' in s ? (s.durationMillis ?? STORY_DURATION) : STORY_DURATION)
            }}
          />
        )}

        {/* Gradient overlay top */}
        <View style={styles.overlayTop} pointerEvents="none" />
        {/* Gradient overlay bottom */}
        <View style={styles.overlayBottom} pointerEvents="none" />

        {/* Progress bars */}
        <View style={[styles.progressWrap, { paddingTop: insets.top + 8 }]}>
          <ProgressBars
            count={group.stories.length}
            current={storyIdx}
            progress={progress}
          />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.authorRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorFallback]}>
                <Text style={{ color: '#fff', fontSize: 16 }}>{authorName.charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.timeSince}>{timeSince}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tap zones */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable
            style={styles.tapLeft}
            onPress={goBack}
            onLongPress={() => handlePauseResume(true)}
            onPressOut={() => handlePauseResume(false)}
          />
          <Pressable
            style={styles.tapRight}
            onPress={advance}
            onLongPress={() => handlePauseResume(true)}
            onPressOut={() => handlePauseResume(false)}
          />
        </View>

        {/* Caption */}
        {story.caption && (
          <View style={[styles.captionWrap, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        )}

        {/* Bottom actions */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}
        >
          {showReply ? (
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder="Reply…"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
                onBlur={() => { if (!replyText.trim()) setShowReply(false) }}
                returnKeyType="send"
                onSubmitEditing={() => void handleReply()}
              />
              <TouchableOpacity onPress={() => void handleReply()} style={styles.sendBtn} disabled={!replyText.trim()}>
                <Ionicons name="send" size={20} color={replyText.trim() ? '#fff' : 'rgba(255,255,255,0.4)'} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              {!isMine && (
                <TouchableOpacity
                  style={styles.replyTrigger}
                  onPress={() => setShowReply(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.replyTriggerText}>Reply…</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => void handleLike()} style={styles.likeBtn} activeOpacity={0.8}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={liked ? '#FF3B6F' : '#fff'}
                />
                {likeCount > 0 && (
                  <Text style={styles.likeCount}>{likeCount}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  media: {
    width: SW,
    height: SH,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'transparent',
  },
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 3,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  authorFallback: {
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeSince: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  tapZones: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 120,
    flexDirection: 'row',
  },
  tapLeft: {
    flex: 2,
  },
  tapRight: {
    flex: 3,
  },
  captionWrap: {
    position: 'absolute',
    left: 16,
    right: 80,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 22,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  replyTrigger: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  replyTriggerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  likeBtn: {
    alignItems: 'center',
    padding: 8,
  },
  likeCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 15,
  },
  sendBtn: {
    padding: 8,
  },
})
