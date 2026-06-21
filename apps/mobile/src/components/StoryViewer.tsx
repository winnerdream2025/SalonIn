/**
 * StoryViewer — full-screen WhatsApp/Instagram-style story viewer.
 *
 * Features:
 * - Animated progress bars per story in the group
 * - Tap left/right to navigate stories, swipe-group auto-advances
 * - Long-press to pause
 * - Heart like (toggle) with count
 * - Reply text input
 * - Video support via expo-av
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
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
const IMAGE_DURATION = 5000

// ─── Progress bar row ─────────────────────────────────────────────────────────

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
        <View key={i} style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean
  groups: StoryGroup[]
  startGroupIndex: number
  onClose: () => void
  /** Called after viewing so the context can update the map */
  onViewed?: (storyId: string, userId: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const groupIdxRef = useRef(groupIdx)
  const storyIdxRef = useRef(storyIdx)

  // Keep refs in sync
  useEffect(() => { groupIdxRef.current = groupIdx }, [groupIdx])
  useEffect(() => { storyIdxRef.current = storyIdx }, [storyIdx])

  // Reset when viewer opens
  useEffect(() => {
    if (visible) {
      setGroupIdx(startGroupIndex)
      setStoryIdx(0)
      setReplyText('')
      setShowReply(false)
      setPaused(false)
    }
  }, [visible, startGroupIndex])

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const goToNext = useCallback(() => {
    const gi = groupIdxRef.current
    const si = storyIdxRef.current
    const g = groups[gi]
    if (!g) return
    animRef.current?.stop()
    if (si < g.stories.length - 1) {
      setStoryIdx((s) => s + 1)
    } else if (gi < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }, [groups, onClose])

  const goToPrev = useCallback(() => {
    const gi = groupIdxRef.current
    const si = storyIdxRef.current
    animRef.current?.stop()
    if (si > 0) {
      setStoryIdx((s) => s - 1)
    } else if (gi > 0) {
      const prevGroup = groups[gi - 1]
      setGroupIdx((i) => i - 1)
      setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0)
    }
  }, [groups])

  // ── Progress animation ─────────────────────────────────────────────────────

  const startProgress = useCallback(
    (duration: number) => {
      progress.setValue(0)
      animRef.current?.stop()
      animRef.current = Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      })
      animRef.current.start(({ finished }) => {
        if (finished) goToNext()
      })
    },
    // goToNext is stable (only refs + onClose); progress ref never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goToNext],
  )

  const pauseProgress = useCallback(() => {
    animRef.current?.stop()
    setPaused(true)
  }, [])

  const resumeProgress = useCallback(() => {
    setPaused(false)
    // Restart from current value — simple but effective
    animRef.current?.start(({ finished }) => {
      if (finished) goToNext()
    })
  }, [goToNext])

  // ── Story change effect ────────────────────────────────────────────────────

  const group = groups[groupIdx]
  const story: Story | undefined = group?.stories[storyIdx]

  useEffect(() => {
    if (!visible || !story || !group) return

    // Update like state
    setLiked(story.likes.length > 0)
    setLikeCount(story._count.likes)

    // Mark as viewed
    onViewed?.(story.id, group.userId)

    // Start timer for images; videos drive their own onLoad
    if (story.type === 'IMAGE') {
      startProgress(IMAGE_DURATION)
    } else {
      progress.setValue(0)
    }

    return () => { animRef.current?.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, story?.id, groupIdx, storyIdx])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleLike = async () => {
    if (!story) return
    const prev = liked
    setLiked(!prev)
    setLikeCount((c) => c + (prev ? -1 : 1))
    try {
      await storiesApi.toggleLike(story.id)
    } catch {
      setLiked(prev)
      setLikeCount((c) => c + (prev ? 1 : -1))
    }
  }

  const handleReply = async () => {
    if (!story || !replyText.trim()) return
    try {
      await storiesApi.reply(story.id, replyText.trim())
      setReplyText('')
      setShowReply(false)
    } catch {}
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!visible || !group || !story) return null

  const isMine = story.userId === user?.id
  const authorName = group.name
  const photoUrl = group.photoUrl

  const timeSince = (() => {
    const diff = Date.now() - new Date(story.createdAt).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h` : `${m}m`
  })()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ── Media ───────────────────────────────────────────────────────── */}
        {story.type === 'IMAGE' ? (
          <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: story.mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            isLooping={false}
            onPlaybackStatusUpdate={(s) => {
              if ('didJustFinish' in s && s.didJustFinish) goToNext()
              if ('durationMillis' in s && s.durationMillis && 'positionMillis' in s && s.positionMillis != null) {
                progress.setValue(s.positionMillis / s.durationMillis)
              }
            }}
            onLoad={(s) => {
              if ('durationMillis' in s) startProgress(s.durationMillis ?? IMAGE_DURATION)
            }}
          />
        )}

        {/* ── Top gradient (semi-transparent overlay for legibility) ───────── */}
        <View style={styles.topGradient} pointerEvents="none" />
        <View style={styles.bottomGradient} pointerEvents="none" />

        {/* ── Progress bars ────────────────────────────────────────────────── */}
        <View style={[styles.progressWrap, { paddingTop: insets.top + 10 }]}>
          <ProgressBars count={group.stories.length} current={storyIdx} progress={progress} />
        </View>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 26 }]}>
          <View style={styles.authorRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorFallback]}>
                <Text style={{ color: '#fff', fontSize: 15 }}>{authorName.charAt(0)}</Text>
              </View>
            )}
            <View style={{ gap: 1 }}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.timeSince}>{timeSince}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Tap zones ─────────────────────────────────────────────────────── */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable
            style={styles.tapLeft}
            onPress={goToPrev}
            onLongPress={pauseProgress}
            onPressOut={paused ? resumeProgress : undefined}
          />
          <Pressable
            style={styles.tapRight}
            onPress={goToNext}
            onLongPress={pauseProgress}
            onPressOut={paused ? resumeProgress : undefined}
          />
        </View>

        {/* ── Caption ───────────────────────────────────────────────────────── */}
        {story.caption != null && story.caption.length > 0 && (
          <View style={[styles.captionWrap, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        )}

        {/* ── Bottom actions ─────────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.bottomActions, { paddingBottom: insets.bottom + 14 }]}
        >
          {showReply ? (
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder="Reply…"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
                onBlur={() => { if (!replyText.trim()) setShowReply(false) }}
                returnKeyType="send"
                onSubmitEditing={() => void handleReply()}
              />
              <TouchableOpacity
                onPress={() => void handleReply()}
                disabled={!replyText.trim()}
                style={{ padding: 8 }}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={replyText.trim() ? '#fff' : 'rgba(255,255,255,0.35)'}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              {!isMine && (
                <TouchableOpacity
                  style={styles.replyTrigger}
                  onPress={() => { setPaused(true); setShowReply(true) }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.replyPlaceholder}>Reply…</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => void handleLike()} style={styles.likeBtn}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={30}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  media: {
    width: SW,
    height: SH,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 3,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
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
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  authorFallback: {
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeSince: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  tapZones: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 130,
    flexDirection: 'row',
  },
  tapLeft: { flex: 2 },
  tapRight: { flex: 3 },
  captionWrap: {
    position: 'absolute',
    left: 16,
    right: 72,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
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
    paddingHorizontal: 14,
    gap: 10,
  },
  replyTrigger: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  replyPlaceholder: {
    color: 'rgba(255,255,255,0.55)',
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
    marginTop: 1,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 15,
  },
})
