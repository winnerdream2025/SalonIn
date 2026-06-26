import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { bookingsApi } from '../../services/booking/booking.api'
import type { WaitlistEntry } from '../../services/booking/booking.types'

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(day))
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime12(t: string) {
  const [h, min] = t.split(':').map(Number)
  const ampm = h! >= 12 ? 'PM' : 'AM'
  const hour = h! % 12 || 12
  return `${hour}:${String(min).padStart(2, '0')} ${ampm}`
}

function WaitlistCard({
  entry,
  onRemove,
  theme,
}: {
  entry: WaitlistEntry
  onRemove: (id: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[s.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={s.cardBody}>
        <View style={[s.avatar, { backgroundColor: theme.brand.primary + '22' }]}>
          <Text style={[s.avatarText, { color: theme.brand.primary }]}>
            {entry.clientName[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={s.info}>
          <Text style={[s.name, { color: theme.text.primary }]}>{entry.clientName}</Text>
          <Text style={[s.sub, { color: theme.text.secondary }]}>{entry.clientEmail}</Text>
          {entry.clientPhone ? (
            <Text style={[s.sub, { color: theme.text.tertiary }]}>{entry.clientPhone}</Text>
          ) : null}
          <View style={s.tagRow}>
            <View style={[s.tag, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
              <Ionicons name="calendar-outline" size={11} color={theme.text.tertiary} />
              <Text style={[s.tagText, { color: theme.text.secondary }]}>
                {formatDate(entry.date)} · {formatTime12(entry.startTime)}
              </Text>
            </View>
            {entry.service?.name ? (
              <View style={[s.tag, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
                <Ionicons name="cut-outline" size={11} color={theme.text.tertiary} />
                <Text style={[s.tagText, { color: theme.text.secondary }]}>{entry.service.name}</Text>
              </View>
            ) : null}
            {entry.notified && (
              <View style={[s.tag, { backgroundColor: '#1D9E7520', borderColor: '#1D9E7540' }]}>
                <Ionicons name="checkmark-circle-outline" size={11} color="#1D9E75" />
                <Text style={[s.tagText, { color: '#1D9E75' }]}>Notified</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onRemove(entry.id)}
          hitSlop={8}
          style={[s.removeBtn, { borderColor: theme.border.default }]}
        >
          <Ionicons name="trash-outline" size={16} color={theme.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function WaitlistManagementScreen() {
  const { theme } = useTheme()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await bookingsApi.getWaitlist()
      setEntries(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load waitlist')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleRemove = useCallback((id: string) => {
    Alert.alert(
      'Remove from Waitlist',
      'Remove this person from your waitlist?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsApi.removeFromWaitlist(id)
              setEntries((prev) => prev.filter((e) => e.id !== id))
            } catch {
              Alert.alert('Error', 'Could not remove entry.')
            }
          },
        },
      ],
    )
  }, [])

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text.primary }]}>Waitlist</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={88} radius={12} />)}
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ color: theme.text.secondary, marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => void load()}
            style={[s.retryBtn, { backgroundColor: theme.brand.primary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={theme.text.tertiary} />}
          renderItem={({ item }) => (
            <WaitlistCard entry={item} onRemove={handleRemove} theme={theme} />
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="people-outline" size={48} color={theme.text.tertiary} style={{ marginBottom: 12 }} />
              <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>
                No one on your waitlist yet.{'\n'}When clients join, they'll appear here.
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: '700' },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
})
