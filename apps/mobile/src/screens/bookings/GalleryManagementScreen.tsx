import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  FlatList,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useAuthStore } from '../../store/authStore'
import { workersApi } from '@salonin/api-client'
import { useProviderServices } from '../../services/booking/booking.hooks'
import { useMyProviderId } from '../../services/booking/booking.hooks'

const { width: SCREEN_W } = Dimensions.get('window')
const THUMB_SIZE = (SCREEN_W - 48 - 16) / 3

// ─── Upload item ──────────────────────────────────────────────────────────────

interface GalleryItem {
  id: string
  url: string
  type: 'IMAGE' | 'VIDEO'
  isCover?: boolean
}

function PhotoThumb({
  item,
  isSelected,
  onPress,
  onLongPress,
  isCover,
}: {
  item: GalleryItem
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  isCover: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[
        styles.thumb,
        isSelected && { borderColor: '#D85A30', borderWidth: 3 },
      ]}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.thumbImg}
        resizeMode="cover"
      />
      {isCover && (
        <View style={styles.coverBadge}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>COVER</Text>
        </View>
      )}
      {isSelected && (
        <View style={styles.checkOverlay}>
          <Ionicons name="checkmark-circle" size={22} color="#D85A30" />
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GalleryManagementScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const { providerId, providerType, isLoading: providerLoading } = useMyProviderId()

  const { services } = useProviderServices(providerId, providerType)

  const [items, setItems] = useState<GalleryItem[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load portfolio from worker profile
  const load = useCallback(async () => {
    if (!user?.id) return
    try {
      const profile = await workersApi.getMe()
      const portfolio: GalleryItem[] = (profile.portfolioItems ?? []).map(
        (p: { id: string; mediaUrl: string; type: string }) => ({
          id: p.id,
          url: p.mediaUrl,
          type: (p.type === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
          isCover: false,
        })
      )
      setItems(portfolio)
      if (portfolio.length > 0 && !coverId) setCoverId(portfolio[0]!.id)
      setIsLoaded(true)
    } catch {
      setIsLoaded(true)
    }
  }, [user?.id, coverId])

  React.useEffect(() => { void load() }, [load])

  const handlePickImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    })
    if (result.canceled) return

    setIsUploading(true)
    let uploadedCount = 0
    for (const asset of result.assets) {
      try {
        await workersApi.addPortfolioItem({ mediaUrl: asset.uri, type: 'IMAGE' })
        uploadedCount++
      } catch {
        // continue
      }
    }
    setIsUploading(false)
    if (uploadedCount > 0) {
      Alert.alert('Uploaded', `${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} added.`)
      await load()
    }
  }, [load])

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    Alert.alert(
      'Delete Photos',
      `Delete ${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              try { await workersApi.deletePortfolioItem(id) } catch { /* continue */ }
            }
            setSelectedIds(new Set())
            await load()
          },
        },
      ]
    )
  }, [selectedIds, load])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSetCover = useCallback(() => {
    if (selectedIds.size !== 1) {
      Alert.alert('Select one photo', 'Select exactly one photo to set as cover.')
      return
    }
    const [id] = [...selectedIds]
    if (id) { setCoverId(id); setSelectedIds(new Set()) }
  }, [selectedIds])

  const isSelecting = selectedIds.size > 0

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Gallery</Text>
        <TouchableOpacity
          onPress={handlePickImages}
          disabled={isUploading}
          style={[styles.addBtn, { backgroundColor: '#D85A30' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Action bar (shown when selecting) */}
      {isSelecting && (
        <View style={[styles.actionBar, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.subtle }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.secondary }}>
            {selectedIds.size} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleSetCover} style={[styles.barBtn, { borderColor: '#1D9E75' }]} activeOpacity={0.75}>
              <Ionicons name="star-outline" size={14} color="#1D9E75" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1D9E75', marginLeft: 4 }}>Set Cover</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteSelected} style={[styles.barBtn, { borderColor: '#E24B4A' }]} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={14} color="#E24B4A" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#E24B4A', marginLeft: 4 }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedIds(new Set())} style={[styles.barBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {isUploading && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: theme.text.secondary }}>Uploading...</Text>
          </View>
        )}

        {!isLoaded || providerLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1,2,3,4,5,6].map(k => <Skeleton key={k} height={THUMB_SIZE} width={THUMB_SIZE} radius={12} />)}
          </View>
        ) : items.length === 0 ? (
          <TouchableOpacity onPress={handlePickImages} style={[styles.emptyState, { borderColor: theme.border.default }]} activeOpacity={0.75}>
            <Ionicons name="images-outline" size={48} color={theme.text.tertiary} />
            <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
              No photos yet.{'\n'}Tap to add your first photo.
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: theme.text.tertiary, marginBottom: 10 }}>
              {items.length} photo{items.length !== 1 ? 's' : ''} · Long-press to select
            </Text>
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              renderItem={({ item }) => (
                <PhotoThumb
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onPress={() => isSelecting ? toggleSelect(item.id) : undefined}
                  onLongPress={() => toggleSelect(item.id)}
                  isCover={coverId === item.id}
                />
              )}
            />
          </>
        )}

        {/* Service attachment hint */}
        {services.length > 0 && items.length > 0 && (
          <View style={[styles.hintCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.text.tertiary} />
            <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 8, flex: 1 }}>
              Tip: Attach photos to services in Manage Services to show them on your booking page.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  pageTitle: {
    flex: 1,
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#D85A30',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFFCC',
    borderRadius: 12,
  },
  emptyState: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 16,
  },
})
