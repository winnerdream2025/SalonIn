import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { highlightsApi, storiesApi, parseApiError } from '@salonin/api-client'
import type { StoryHighlight, Story } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'

export default function HighlightsScreen() {
  const { theme } = useTheme()
  const userId = useAuthStore((s) => s.user?.id)

  const [highlights, setHighlights] = useState<StoryHighlight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [myStories, setMyStories] = useState<Story[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingStories, setLoadingStories] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await highlightsApi.getForUser(userId)
      setHighlights(data)
    } catch {
      setHighlights([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { void load() }, [load])

  const openCreate = useCallback(async () => {
    setTitle('')
    setSelectedIds(new Set())
    setShowCreate(true)
    setLoadingStories(true)
    try {
      const stories = await storiesApi.getMyStories()
      setMyStories(stories)
    } catch {
      setMyStories([])
    } finally {
      setLoadingStories(false)
    }
  }, [])

  const toggleStory = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const submit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your highlight a title.')
      return
    }
    const storyIds = [...selectedIds]
    const cover = myStories.find((s) => selectedIds.has(s.id))?.mediaUrl ?? undefined
    setSaving(true)
    try {
      const created = await highlightsApi.create({
        title: title.trim(),
        ...(cover ? { coverUrl: cover } : {}),
        ...(storyIds.length ? { storyIds } : {}),
      })
      setHighlights((prev) => [created, ...prev])
      setShowCreate(false)
    } catch (e) {
      Alert.alert('Could not create', parseApiError(e))
    } finally {
      setSaving(false)
    }
  }, [title, selectedIds, myStories])

  const handleDelete = useCallback((hl: StoryHighlight) => {
    Alert.alert('Delete highlight', `Delete "${hl.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setHighlights((prev) => prev.filter((h) => h.id !== hl.id))
          try {
            await highlightsApi.remove(hl.id)
          } catch {
            void load()
          }
        },
      },
    ])
  }, [load])

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text.primary }]}>Highlights</Text>
        <TouchableOpacity onPress={() => void openCreate()} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={theme.brand.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={theme.brand.primary} />
      ) : (
        <FlatList
          data={highlights}
          keyExtractor={(h) => h.id}
          numColumns={3}
          contentContainerStyle={highlights.length === 0 ? s.emptyWrap : { padding: 12 }}
          columnWrapperStyle={highlights.length > 0 ? { gap: 12 } : undefined}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.hlItem}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              <View style={[s.hlCircle, { borderColor: theme.border.default, backgroundColor: theme.bg.elevated }]}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={s.hlImage} />
                ) : (
                  <Ionicons name="bookmark" size={24} color={theme.text.tertiary} />
                )}
              </View>
              <Text style={[s.hlTitle, { color: theme.text.primary }]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyInner}>
              <Ionicons name="bookmark-outline" size={40} color={theme.text.tertiary} />
              <Text style={[s.emptyTitle, { color: theme.text.primary }]}>No highlights yet</Text>
              <Text style={[s.emptySub, { color: theme.text.secondary }]}>
                Group your best stories into highlights that stay on your profile.
              </Text>
              <TouchableOpacity
                onPress={() => void openCreate()}
                style={[s.cta, { backgroundColor: theme.brand.primary }]}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create highlight</Text>
              </TouchableOpacity>
            </View>
          }
          ListHeaderComponent={
            highlights.length > 0 ? (
              <Text style={{ fontSize: 12, color: theme.text.tertiary, paddingBottom: 10 }}>
                Long-press a highlight to delete it.
              </Text>
            ) : null
          }
        />
      )}

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { backgroundColor: theme.bg.base }]}>
            <View style={[s.modalHeader, { borderBottomColor: theme.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={8}>
                <Text style={{ color: theme.brand.primary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text.primary }}>New Highlight</Text>
              <TouchableOpacity onPress={() => void submit()} disabled={saving} hitSlop={8}>
                <Text style={{ color: saving ? theme.text.tertiary : theme.brand.primary, fontSize: 15, fontWeight: '700' }}>
                  {saving ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Highlight title"
              placeholderTextColor={theme.text.tertiary}
              maxLength={50}
              style={[s.titleInput, { color: theme.text.primary, backgroundColor: theme.bg.input, borderColor: theme.border.default }]}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary, paddingHorizontal: 16, marginBottom: 8 }}>
              Select stories to include
            </Text>

            {loadingStories ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={theme.brand.primary} />
            ) : (
              <FlatList
                data={myStories}
                keyExtractor={(st) => st.id}
                numColumns={3}
                contentContainerStyle={{ padding: 12 }}
                columnWrapperStyle={{ gap: 8 }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => {
                  const selected = selectedIds.has(item.id)
                  return (
                    <TouchableOpacity onPress={() => toggleStory(item.id)} style={s.storyThumb} activeOpacity={0.8}>
                      {item.mediaUrl ? (
                        <Image source={{ uri: item.mediaUrl }} style={s.storyImage} />
                      ) : (
                        <View style={[s.storyImage, { backgroundColor: item.textBgColor ?? theme.bg.elevated, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ fontSize: 10, color: theme.text.secondary }} numberOfLines={3}>
                            {item.textContent ?? 'Text'}
                          </Text>
                        </View>
                      )}
                      {selected && (
                        <View style={s.selectedOverlay}>
                          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: theme.text.tertiary, marginTop: 24 }}>
                    You have no active stories to add. You can still create an empty highlight.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
  hlItem: { flex: 1 / 3, alignItems: 'center', gap: 6 },
  hlCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hlImage: { width: '100%', height: '100%' },
  hlTitle: { fontSize: 12, fontWeight: '600', maxWidth: 90, textAlign: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cta: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleInput: {
    margin: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  storyThumb: { flex: 1 / 3, aspectRatio: 0.7, borderRadius: 10, overflow: 'hidden' },
  storyImage: { width: '100%', height: '100%' },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(216,90,48,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
