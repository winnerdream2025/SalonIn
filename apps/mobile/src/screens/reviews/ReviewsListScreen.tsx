import React, { useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Avatar, Text, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import { reviewsApi } from '@salonin/api-client'
import { useReviews } from '../../hooks/useReviews'
import { useAuthStore } from '../../store/authStore'
import type { ReviewCardData } from '@salonin/types'

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: size, opacity: s <= rating ? 1 : 0.2 }}>⭐</Text>
      ))}
    </View>
  )
}

interface ReviewCardProps {
  review: ReviewCardData
  theme: Theme
  currentUserId: string | undefined
  subjectId: string
  subjectName: string
  onDeleted: (id: string) => void
  onReplied: (updated: ReviewCardData) => void
}

function ReviewCard({ review, theme, currentUserId, subjectId, subjectName, onDeleted, onReplied }: ReviewCardProps) {
  const date = new Date(review.createdAt)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOwnReview = currentUserId === review.authorId
  const isSubject = currentUserId === subjectId
  const canReply = isSubject && !review.reply

  function handleDelete() {
    Alert.alert(
      'Delete review',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewsApi.deleteReview(review.id)
              onDeleted(review.id)
            } catch {
              Alert.alert('Error', 'Could not delete review. Please try again.')
            }
          },
        },
      ],
    )
  }

  async function handleSubmitReply() {
    if (!replyText.trim()) return
    setSubmitting(true)
    Keyboard.dismiss()
    try {
      const updated = await reviewsApi.replyToReview(review.id, replyText.trim())
      onReplied(updated)
      setShowReplyInput(false)
      setReplyText('')
    } catch {
      Alert.alert('Error', 'Could not submit reply. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={styles.cardHeader}>
        <Avatar uri={review.authorPhotoUrl} name={review.authorName} size="sm" />
        <View style={styles.cardMeta}>
          <Text style={[styles.authorName, { color: theme.text.primary }]} numberOfLines={1}>
            {review.authorName}
          </Text>
          <View style={styles.metaRow}>
            <StarRow rating={review.rating} size={12} />
            <Text style={[styles.dateText, { color: theme.text.tertiary }]}>{formatted}</Text>
          </View>
        </View>
        {isOwnReview && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.deleteBtn, { color: theme.text.tertiary }]}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>

      {review.comment ? (
        <Text style={[styles.comment, { color: theme.text.secondary }]}>
          {review.comment}
        </Text>
      ) : null}

      {/* Reply thread (Google-style) */}
      {review.reply ? (
        <View style={[styles.replyBox, { backgroundColor: theme.bg.elevated, borderLeftColor: theme.brand.primary }]}>
          <Text style={[styles.replyLabel, { color: theme.text.tertiary }]}>Reply from {subjectName}</Text>
          <Text style={[styles.replyText, { color: theme.text.secondary }]}>{review.reply}</Text>
          {review.repliedAt ? (
            <Text style={[styles.dateText, { color: theme.text.tertiary }]}>
              {new Date(review.repliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          ) : null}
        </View>
      ) : canReply && !showReplyInput ? (
        <TouchableOpacity onPress={() => setShowReplyInput(true)} style={styles.replyTrigger}>
          <Text style={[styles.replyTriggerText, { color: theme.brand.primary }]}>Reply to this review</Text>
        </TouchableOpacity>
      ) : null}

      {/* Inline reply input */}
      {showReplyInput && (
        <View style={[styles.replyInputWrap, { borderTopColor: theme.border.subtle }]}>
          <TextInput
            style={[styles.replyInput, { backgroundColor: theme.bg.elevated, color: theme.text.primary, borderColor: theme.border.default }]}
            placeholder="Write a reply..."
            placeholderTextColor={theme.text.tertiary}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            autoFocus
            maxLength={600}
          />
          <View style={styles.replyActions}>
            <TouchableOpacity onPress={() => { setShowReplyInput(false); setReplyText('') }}>
              <Text style={[styles.replyCancel, { color: theme.text.tertiary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmitReply}
              disabled={submitting || !replyText.trim()}
              style={[styles.replySubmit, { backgroundColor: theme.brand.primary, opacity: !replyText.trim() ? 0.4 : 1 }]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.replySubmitText}>Post</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

export default function ReviewsListScreen() {
  const { userId, userName, rating, reviewCount } = useLocalSearchParams<{
    userId: string
    userName: string
    rating?: string
    reviewCount?: string
  }>()
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const { reviews, isLoading } = useReviews(userId)
  const [localReviews, setLocalReviews] = useState<ReviewCardData[] | null>(null)

  const displayed = localReviews ?? reviews

  const avg = rating ? parseFloat(rating) : null
  const count = reviewCount ? parseInt(reviewCount, 10) : 0

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.brand.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
          Reviews
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary banner */}
      {avg !== null && (
        <View style={[styles.summaryBanner, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <Text style={[styles.avgNumber, { color: theme.text.primary }]}>{avg.toFixed(1)}</Text>
          <StarRow rating={Math.round(avg)} size={20} />
          <Text style={[styles.countText, { color: theme.text.secondary }]}>
            {count} {count === 1 ? 'review' : 'reviews'} for {userName}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={theme.brand.primary} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 44 }}>⭐</Text>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No reviews yet</Text>
          <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
            {userName} hasn't received any reviews yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              theme={theme}
              currentUserId={user?.id}
              subjectId={userId}
              subjectName={userName ?? ''}
              onDeleted={(id) => setLocalReviews((prev) => (prev ?? reviews).filter((r) => r.id !== id))}
              onReplied={(updated) => setLocalReviews((prev) => (prev ?? reviews).map((r) => r.id === updated.id ? updated : r))}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  summaryBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  avgNumber: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  countText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardMeta: { flex: 1, gap: 4 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 11 },
  comment: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { fontSize: 16, paddingLeft: 4 },
  replyBox: {
    marginTop: 4,
    marginLeft: 16,
    paddingLeft: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    gap: 4,
  },
  replyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  replyText: { fontSize: 13, lineHeight: 18 },
  replyTrigger: { marginTop: 4, alignSelf: 'flex-start' },
  replyTriggerText: { fontSize: 13, fontWeight: '600' },
  replyInputWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  replyInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  replyCancel: { fontSize: 14, fontWeight: '500' },
  replySubmit: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20 },
  replySubmitText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
