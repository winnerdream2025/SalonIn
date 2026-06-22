/**
 * StoryViewer — full-screen story viewer.
 *
 * Features:
 * - Animated progress bars per story in a group
 * - Tap left/right to navigate, tap ✕ to close
 * - Long-press to pause
 * - Swipe down to close (PanResponder)
 * - Heart like toggle with count
 * - Reply text field (routes into chat)
 * - Video support via expo-av
 * - Booking CTA when story.bookingEnabled
 * - Owner actions: delete, edit caption, view analytics
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Video, ResizeMode } from 'expo-av'
import { Text } from '@salonin/ui'
import { storiesApi } from '@salonin/api-client'
import type { Story, StoryGroup } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

const { width: SW, height: SH } = Dimensions.get('window')
const IMAGE_DURATION = 5000

// ─── Progress bars ────────────────────────────────────────────────────────────

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

// ─── Text story canvas ────────────────────────────────────────────────────────

function TextStoryCanvas({ story }: { story: Story }) {
  return (
    <View
      style={[
        styles.media,
        { backgroundColor: story.textBgColor ?? '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: 38,
          paddingHorizontal: 32,
        }}
      >
        {story.textContent ?? ''}
      </Text>
    </View>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean
  groups: StoryGroup[]
  startGroupIndex: number
  onClose: () => void
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

  // Caption edit (owner)
  const [showCaptionEdit, setShowCaptionEdit] = useState(false)
  const [editCaption, setEditCaption] = useState('')

  const progress = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const animRef = useRef<Animated.CompositeAnimation | null>(null)
  const groupIdxRef = useRef(groupIdx)
  const storyIdxRef = useRef(storyIdx)

  useEffect(() => { groupIdxRef.current = groupIdx }, [groupIdx])
  useEffect(() => { storyIdxRef.current = storyIdx }, [storyIdx])

  useEffect(() => {
    if (visible) {
      setGroupIdx(startGroupIndex)
      setStoryIdx(0)
      setReplyText('')
      setShowReply(false)
      setPaused(false)
      translateY.setValue(0)
    }
  }, [visible, startGroupIndex])

  // ── Swipe-down to close ───────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) && dy > 0,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy)
      },
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 100) {
          Animated.timing(translateY, {
            toValue: SH,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose)
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        }
      },
    }),
  ).current

  // ── Navigation ────────────────────────────────────────────────────────────

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
    [goToNext],
  )

  const pauseProgress = useCallback(() => {
    animRef.current?.stop()
    setPaused(true)
  }, [])

  const resumeProgress = useCallback(() => {
    setPaused(false)
    animRef.current?.start(({ finished }) => {
      if (finished) goToNext()
    })
  }, [goToNext])

  // ── Story change ─────────────────────────────────────────────────────────

  const group = groups[groupIdx]
  const story: Story | undefined = group?.stories[storyIdx]

  useEffect(() => {
    if (!visible || !story || !group) return

    setLiked(story.likes.length > 0)
    setLikeCount(story._count.likes)
    setShowCaptionEdit(false)
    setEditCaption(story.caption ?? '')

    onViewed?.(story.id, group.userId)

    if (story.type !== 'VIDEO') {
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
      resumeProgress()
    } catch {
      Alert.alert('Error', 'Failed to send reply. Try again.')
    }
  }

  const handleDelete = () => {
    if (!story) return
    Alert.alert(
      'Delete Story',
      'This will remove your story for everyone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storiesApi.deleteStory(story.id)
              goToNext()
            } catch {
              Alert.alert('Error', 'Failed to delete story.')
            }
          },
        },
      ],
    )
  }

  const handleSaveCaption = async () => {
    if (!story) return
    try {
      await storiesApi.update(story.id, { caption: editCaption.trim() || undefined })
      setShowCaptionEdit(false)
      resumeProgress()
    } catch {
      Alert.alert('Error', 'Failed to update caption.')
    }
  }

  const showOwnerMenu = () => {
    if (!story) return
    pauseProgress()
    Alert.alert('Story options', undefined, [
      {
        text: 'Edit caption',
        onPress: () => {
          setEditCaption(story.caption ?? '')
          setShowCaptionEdit(true)
        },
      },
      {
        text: 'View analytics',
        onPress: () => {
          onClose()
          router.push(`/story-analytics/${story.id}` as never)
        },
      },
      {
        text: 'Delete story',
        style: 'destructive',
        onPress: handleDelete,
      },
      { text: 'Cancel', style: 'cancel', onPress: resumeProgress },
    ])
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
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* ── Media ──────────────────────────────────────────────────── */}
        {story.type === 'IMAGE' && story.mediaUrl ? (
          <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : story.type === 'VIDEO' && story.mediaUrl ? (
          <Video
            source={{ uri: story.mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            isLooping={false}
            onPlaybackStatusUpdate={(s) => {
              if ('didJustFinish' in s && s.didJustFinish) goToNext()
              if (
                'durationMillis' in s && s.durationMillis &&
                'positionMillis' in s && s.positionMillis != null
              ) {
                progress.setValue(s.positionMillis / s.durationMillis)
              }
            }}
            onLoad={(s) => {
              if ('durationMillis' in s) startProgress(s.durationMillis ?? IMAGE_DURATION)
            }}
          />
        ) : (
          <TextStoryCanvas story={story} />
        )}

        {/* ── Overlays ────────────────────────────────────────────── */}
        <View style={styles.topGradient} pointerEvents="none" />
        <View style={styles.bottomGradient} pointerEvents="none" />

        {/* ── Progress bars ───────────────────────────────────────── */}
        <View style={[styles.progressWrap, { paddingTop: insets.top + 10 }]}>
          <ProgressBars count={group.stories.length} current={storyIdx} progress={progress} />
        </View>

        {/* ── Header ──────────────────────────────────────────────── */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.timeSince}>{timeSince}</Text>
                {story.location ? (
                  <>
                    <Text style={styles.timeSince}>·</Text>
                    <Ionicons name="location" size={10} color="rgba(255,255,255,0.55)" />
                    <Text style={styles.timeSince}>{story.location}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {isMine && (
              <TouchableOpacity
                onPress={showOwnerMenu}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tap zones ───────────────────────────────────────────── */}
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

        {/* ── Caption ─────────────────────────────────────────────── */}
        {story.caption != null && story.caption.length > 0 && (
          <View style={[styles.captionWrap, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.caption}>{story.caption}</Text>
          </View>
        )}

        {/* ── Booking CTA ─────────────────────────────────────────── */}
        {story.bookingEnabled && !isMine && (
          <TouchableOpacity
            style={[styles.bookingCTA, { bottom: insets.bottom + 100 + (story.caption ? 50 : 0) }]}
            activeOpacity={0.85}
            onPress={() => {
              pauseProgress()
              Alert.alert('Book Now', 'Booking flow would open here.')
            }}
          >
            <Ionicons name="calendar" size={15} color="#fff" />
            <Text style={styles.bookingCTAText}>Book Now</Text>
          </TouchableOpacity>
        )}

        {/* ── Owner viewer count ──────────────────────────────────── */}
        {isMine && (
          <TouchableOpacity
            style={[styles.viewerCount, { bottom: insets.bottom + 100 }]}
            onPress={() => {
              onClose()
              router.push(`/story-analytics/${story.id}` as never)
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.viewerCountText}>{story._count.views}</Text>
          </TouchableOpacity>
        )}

        {/* ── Caption edit overlay ─────────────────────────────────── */}
        {showCaptionEdit && (
          <View style={[StyleSheet.absoluteFillObject, styles.captionEditOverlay]}>
            <TextInput
              style={styles.captionEditInput}
              value={editCaption}
              onChangeText={setEditCaption}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              autoFocus
              maxLength={300}
            />
            <View style={styles.captionEditActions}>
              <TouchableOpacity
                onPress={() => { setShowCaptionEdit(false); resumeProgress() }}
                style={styles.captionEditCancel}
              >
                <Text style={{ color: '#aaa', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSaveCaption()}
                style={styles.captionEditSave}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Bottom actions ──────────────────────────────────────── */}
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
                onBlur={() => { if (!replyText.trim()) { setShowReply(false); resumeProgress() } }}
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
                  onPress={() => { pauseProgress(); setShowReply(true) }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.replyPlaceholder}>Reply…</Text>
                </TouchableOpacity>
              )}
              {isMine ? (
                <TouchableOpacity
                  onPress={() => {
                    onClose()
                    router.push(`/story-analytics/${story.id}` as never)
                  }}
                  style={styles.analyticsBtn}
                >
                  <Ionicons name="bar-chart-outline" size={22} color="#fff" />
                  <Text style={styles.analyticsCount}>{story._count.views}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => void handleLike()} style={styles.likeBtn}>
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={30}
                    color={liked ? '#FF3B6F' : '#fff'}
                  />
                  {likeCount > 0 && <Text style={styles.likeCount}>{likeCount}</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  )
}

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
    height: 200,
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
    flex: 1,
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
    fontSize: 11,
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
  bookingCTA: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D85A30',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookingCTAText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  viewerCount: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerCountText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  captionEditOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  captionEditInput: {
    width: '100%',
    color: '#fff',
    fontSize: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
  },
  captionEditActions: {
    flexDirection: 'row',
    gap: 12,
  },
  captionEditCancel: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  captionEditSave: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#D85A30',
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
  analyticsBtn: {
    alignItems: 'center',
    padding: 8,
    gap: 2,
  },
  analyticsCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
