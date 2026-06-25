import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Avatar, useTheme } from '@salonin/ui'
import { workersApi } from '@salonin/api-client'
import type { WorkerProfileFull } from '@salonin/types'
import { specialtyLabel } from '@salonin/config'

export default function SavedWorkersScreen() {
  const { theme } = useTheme()
  const [workers, setWorkers] = useState<WorkerProfileFull[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const data = await workersApi.getSavedWorkers()
      setWorkers(data)
    } catch {
      // noop
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleUnsave = useCallback(async (worker: WorkerProfileFull) => {
    setWorkers((prev) => prev.filter((w) => w.id !== worker.id))
    try {
      await workersApi.toggleSaveWorker(worker.id)
    } catch {
      setWorkers((prev) => [worker, ...prev])
    }
  }, [])

  const renderItem = useCallback(({ item }: { item: WorkerProfileFull }) => {
    const specialty = (item.specialties ?? [])[0]
    return (
      <TouchableOpacity
        style={[s.row, { backgroundColor: theme.bg.card, borderBottomColor: theme.border.subtle }]}
        onPress={() => router.push(`/worker/${item.id}` as never)}
        activeOpacity={0.75}
      >
        <Avatar uri={item.photoUrl} name={item.name} size="lg" />
        <View style={s.info}>
          <Text style={[s.name, { color: theme.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          {specialty && (
            <Text style={[s.specialty, { color: theme.text.secondary }]} numberOfLines={1}>
              {specialtyLabel(specialty)}
            </Text>
          )}
          <View style={s.metaRow}>
            {item.rating > 0 && (
              <>
                <Text style={[s.meta, { color: theme.text.secondary }]}>
                  {item.rating.toFixed(1)}
                </Text>
                <Ionicons name="star" size={10} color="#EF9F27" />
              </>
            )}
            {item.city && (
              <Text style={[s.meta, { color: theme.text.tertiary }]}>
                {[item.city, item.state].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => void handleUnsave(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="bookmark" size={22} color="#D85A30" />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [theme, handleUnsave])

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text.primary }]}>Saved</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={theme.brand.primary} />
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isRefreshing}
          onRefresh={() => void load(true)}
          contentContainerStyle={workers.length === 0 ? s.emptyWrap : undefined}
          ListEmptyComponent={
            <View style={s.emptyInner}>
              <Ionicons name="bookmark-outline" size={40} color={theme.text.tertiary} />
              <Text style={[s.emptyTitle, { color: theme.text.primary }]}>No saved workers</Text>
              <Text style={[s.emptySub, { color: theme.text.secondary }]}>
                Tap the bookmark icon on any worker profile to save them here
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
    paddingVertical: 12,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  specialty: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
