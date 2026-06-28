import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { Text, Avatar, useTheme } from '@salonin/ui'
import { postsApi } from '@salonin/api-client'
import type { PostData, PostComment, PostAuthor } from '@salonin/api-client'

const { width } = Dimensions.get('window')

type FeedMode = 'following' | 'explore'

function authorName(a?: PostAuthor): string {
  return a?.workerProfile?.name ?? a?.salonProfile?.name ?? a?.clientProfile?.name ?? 'User'
}

function authorPhoto(a?: PostAuthor): string | undefined {
  return a?.workerProfile?.photoUrl ?? a?.salonProfile?.photoUrls?.[0] ?? a?.clientProfile?.photoUrl ?? undefined
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return 'now'
}

// ─── Post card ──────────────────────────────────────────────────────────────

function PostCard({
  post,
  onToggleLike,
  onOpenComments,
  theme,
}: {
  post: PostData
  onToggleLike: (post: PostData) => void
  onOpenComments: (post: PostData) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const liked = (post.likes?.length ?? 0) > 0
  const media = post.type === 'BEFORE_AFTER' ? [post.beforeUrl, post.afterUrl].filter(Boolean) as string[] : post.mediaUrls
  const cover = media[0]

  return (
    <View style={[s.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Avatar uri={authorPhoto(post.user)} name={authorName(post.user)} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
            {authorName(post.user)}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.tertiary }}>{timeAgo(post.createdAt)}</Text>
        </View>
      </View>

      {/* Media */}
      {cover ? (
        <Image source={{ uri: cover }} style={s.media} resizeMode="cover" />
      ) : null}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity onPress={() => onToggleLike(post)} hitSlop={8} style={s.actionItem} activeOpacity={0.7}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#FF3B6F' : theme.text.primary} />
          <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 5 }}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenComments(post)} hitSlop={8} style={s.actionItem} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.text.primary} />
          <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 5 }}>{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {post.caption ? (
        <Text style={{ fontSize: 14, color: theme.text.primary, paddingHorizontal: 14, paddingBottom: 14, lineHeight: 19 }}>
          <Text style={{ fontWeight: '700' }}>{authorName(post.user)} </Text>
          {post.caption}
        </Text>
      ) : null}
    </View>
  )
}

// ─── Comments modal ───────────────────────────────────────────────────────────

function CommentsModal({
  post,
  onClose,
  onAdded,
  theme,
}: {
  post: PostData | null
  onClose: () => void
  onAdded: (postId: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [comments, setComments] = useState<PostComment[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    if (!post) return
    setLoading(true)
    postsApi.getComments(post.id)
      .then((res) => setComments(res.data))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [post])

  const submit = useCallback(async () => {
    if (!post || !text.trim()) return
    setPosting(true)
    try {
      const c = await postsApi.addComment(post.id, text.trim())
      setComments((prev) => [...prev, c])
      setText('')
      onAdded(post.id)
    } catch {
      // noop
    } finally {
      setPosting(false)
    }
  }, [post, text, onAdded])

  return (
    <Modal visible={post != null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.modalSheet, { backgroundColor: theme.bg.base }]}
        >
          <View style={[s.modalHeader, { borderBottomColor: theme.border.subtle }]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text.primary }}>Comments</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.brand.primary} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ padding: 16, gap: 14 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Avatar uri={authorPhoto(item.user)} name={authorName(item.user)} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }}>
                      {authorName(item.user)}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.text.secondary, marginTop: 1 }}>{item.content}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.text.tertiary, marginTop: 32 }}>
                  No comments yet. Be the first!
                </Text>
              }
            />
          )}

          <View style={[s.commentBar, { borderTopColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor={theme.text.tertiary}
              style={[s.commentInput, { color: theme.text.primary, backgroundColor: theme.bg.input }]}
              multiline
            />
            <TouchableOpacity onPress={() => void submit()} disabled={posting || !text.trim()} hitSlop={8}>
              <Ionicons name="send" size={22} color={text.trim() ? theme.brand.primary : theme.text.tertiary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PostsFeedScreen() {
  const { theme } = useTheme()
  const [mode, setMode] = useState<FeedMode>('following')
  const [posts, setPosts] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [commentsTarget, setCommentsTarget] = useState<PostData | null>(null)

  const load = useCallback(async (m: FeedMode, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      if (m === 'following') {
        const res = await postsApi.getFeed()
        setPosts(res.posts)
      } else {
        const res = await postsApi.getExplore()
        setPosts(res.posts)
      }
    } catch {
      setPosts([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { void load(mode) }, [mode, load])

  const handleToggleLike = useCallback(async (post: PostData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const liked = (post.likes?.length ?? 0) > 0
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes: liked ? [] : [{ id: 'local' }], likesCount: p.likesCount + (liked ? -1 : 1) }
          : p,
      ),
    )
    try {
      if (liked) await postsApi.unlike(post.id)
      else await postsApi.like(post.id)
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likes: liked ? [{ id: 'server' }] : [], likesCount: p.likesCount + (liked ? 1 : -1) }
            : p,
        ),
      )
    }
  }, [])

  const handleCommentAdded = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)))
  }, [])

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={s.segment}>
          {(['following', 'explore'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[s.segmentBtn, mode === m && { backgroundColor: theme.brand.primary }]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: mode === m ? '#FFFFFF' : theme.text.secondary }}>
                {m === 'following' ? 'Following' : 'Explore'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => router.push('/posts/create' as never)} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={theme.brand.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={theme.brand.primary} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={posts.length === 0 ? s.emptyWrap : { padding: 12, gap: 12 }}
          refreshing={isRefreshing}
          onRefresh={() => void load(mode, true)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={handleToggleLike}
              onOpenComments={setCommentsTarget}
              theme={theme}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyInner}>
              <Ionicons name="images-outline" size={40} color={theme.text.tertiary} />
              <Text style={[s.emptyTitle, { color: theme.text.primary }]}>
                {mode === 'following' ? 'Your feed is empty' : 'Nothing trending yet'}
              </Text>
              <Text style={[s.emptySub, { color: theme.text.secondary }]}>
                {mode === 'following'
                  ? 'Follow stylists and salons to see their posts here.'
                  : 'Check back soon for popular posts.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <CommentsModal
        post={commentsTarget}
        onClose={() => setCommentsTarget(null)}
        onAdded={handleCommentAdded}
        theme={theme}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  segment: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  media: { width: width - 24, height: width - 24, backgroundColor: '#00000010' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { height: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
})
