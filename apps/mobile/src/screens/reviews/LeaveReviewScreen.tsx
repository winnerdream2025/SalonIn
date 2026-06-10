import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Avatar, Text, useTheme } from '@salonin/ui'
import { reviewsApi, parseApiError } from '@salonin/api-client'

export default function LeaveReviewScreen() {
  const { subjectId, subjectName, subjectPhoto } = useLocalSearchParams<{
    subjectId: string
    subjectName: string
    subjectPhoto?: string
  }>()
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStar = useCallback(async (star: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRating(star)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.')
      return
    }
    if (!subjectId) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSubmitting(true)
    try {
      await reviewsApi.create({ subjectId, rating, comment: comment.trim() || undefined })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Review submitted! ⭐', 'Thank you for your feedback.', [
        { text: 'Done', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Review failed', parseApiError(e))
    } finally {
      setIsSubmitting(false)
    }
  }, [subjectId, rating, comment])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.headerAction, { color: theme.brand.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Leave a Review</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Subject info */}
        <View style={styles.subjectRow}>
          <Avatar uri={subjectPhoto ?? null} name={subjectName ?? '?'} size="lg" />
          <Text style={[styles.subjectName, { color: theme.text.primary }]} numberOfLines={1}>
            {subjectName}
          </Text>
        </View>

        {/* Stars */}
        <View style={styles.starsSection}>
          <Text style={[styles.starsLabel, { color: theme.text.secondary }]}>Your rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => void handleStar(star)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={[styles.star, { opacity: star <= rating ? 1 : 0.25 }]}>⭐</Text>
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: theme.brand.primary }]}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </Text>
          )}
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={[styles.commentLabel, { color: theme.text.secondary }]}>
            Comment <Text style={{ color: theme.text.tertiary }}>(optional)</Text>
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience — what went well, what could be better..."
            placeholderTextColor={theme.text.tertiary}
            multiline
            maxLength={500}
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.bg.elevated,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
            autoCapitalize="sentences"
          />
          <Text style={[styles.charCount, { color: comment.length > 460 ? theme.brand.primary : theme.text.tertiary }]}>
            {comment.length}/500
          </Text>
        </View>
      </ScrollView>

      {/* Submit CTA */}
      <View style={[styles.cta, { backgroundColor: theme.bg.surface, borderTopColor: theme.border.subtle, paddingBottom: Math.max(bottom, 16) }]}>
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={isSubmitting || rating === 0}
          style={[styles.ctaBtn, (isSubmitting || rating === 0) && { opacity: 0.45 }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaBtnText, { color: '#FFFFFF' }]}>
            {isSubmitting ? 'Submitting…' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerAction: { fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 28 },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  subjectName: { fontSize: 18, fontWeight: '700', flex: 1 },
  starsSection: { gap: 10, alignItems: 'center' },
  starsLabel: { fontSize: 13, fontWeight: '600', alignSelf: 'flex-start' },
  starsRow: { flexDirection: 'row', gap: 12 },
  star: { fontSize: 42 },
  ratingLabel: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  commentSection: { gap: 8 },
  commentLabel: { fontSize: 13, fontWeight: '600' },
  commentInput: {
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, textAlign: 'right' },
  cta: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700' },
})
