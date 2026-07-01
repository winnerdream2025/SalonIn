import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Avatar, Text, useTheme } from '@salonin/ui'

interface ReviewCardProps {
  authorName: string
  authorPhoto?: string
  rating: number
  body: string
  createdAt: string
  serviceName?: string
  reply?: string
  theme?: ReturnType<typeof useTheme>['theme']
}

export function ReviewCard({ authorName, authorPhoto, rating, body, createdAt, serviceName, reply, theme: themeProp }: ReviewCardProps) {
  const { theme: themeCtx } = useTheme()
  const theme = themeProp ?? themeCtx

  const formatted = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.header}>
        <Avatar uri={authorPhoto} name={authorName} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{authorName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <StarRow rating={rating} />
            <Text style={{ fontSize: 11, color: theme.text.tertiary }}>{formatted}</Text>
          </View>
        </View>
      </View>
      {serviceName ? (
        <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 4 }}>{serviceName}</Text>
      ) : null}
      <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 20, marginTop: 6 }}>
        {body}
      </Text>
      {reply ? (
        <View style={[styles.reply, { backgroundColor: theme.bg.elevated, borderLeftColor: '#D85A30' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text.primary, marginBottom: 2 }}>Reply</Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 18 }}>{reply}</Text>
        </View>
      ) : null}
    </View>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: 12, opacity: s <= rating ? 1 : 0.2 }}>⭐</Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  reply: {
    marginTop: 10,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
  },
})
