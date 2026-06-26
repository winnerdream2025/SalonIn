import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { postsApi, mediaApi } from '@salonin/api-client'
import type { PostVisibility } from '@salonin/api-client'

type Tab = 'PHOTO' | 'BEFORE_AFTER' | 'TEXT'
const TEXT_BG_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2c2c54', '#373b44', '#4a1942', '#2d6a4f']

export default function PostCreateScreen() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<Tab>('PHOTO')
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC')
  const [bookingEnabled, setBookingEnabled] = useState(false)
  const [mediaUris, setMediaUris] = useState<string[]>([])
  const [beforeUri, setBeforeUri] = useState<string | null>(null)
  const [afterUri, setAfterUri] = useState<string | null>(null)
  const [textBg, setTextBg] = useState(TEXT_BG_COLORS[0])
  const [posting, setPosting] = useState(false)

  const pickImages = useCallback(async (multiple = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow media library access in Settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: multiple,
      quality: 0.85,
    })
    if (!result.canceled) {
      setMediaUris(result.assets.map((a) => a.uri))
    }
  }, [])

  const pickSingle = useCallback(async (onPick: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow media library access in Settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri)
    }
  }, [])

  const uploadUri = useCallback(async (uri: string): Promise<string> => {
    const { url } = await mediaApi.uploadMedia({ uri, mimeType: 'image/jpeg', name: 'post.jpg' }, 'uploads')
    return url
  }, [])

  const handlePost = useCallback(async () => {
    if (tab === 'PHOTO' && mediaUris.length === 0) {
      Alert.alert('No images', 'Select at least one photo.')
      return
    }
    if (tab === 'BEFORE_AFTER' && (!beforeUri || !afterUri)) {
      Alert.alert('Missing images', 'Select both a before and after photo.')
      return
    }
    if (tab === 'TEXT' && !caption.trim()) {
      Alert.alert('Empty', 'Write something first.')
      return
    }
    setPosting(true)
    try {
      if (tab === 'PHOTO') {
        const urls = await Promise.all(mediaUris.map(uploadUri))
        await postsApi.create({ type: 'PHOTO', caption: caption.trim() || undefined, mediaUrls: urls, visibility, bookingEnabled })
      } else if (tab === 'BEFORE_AFTER') {
        const [bUrl, aUrl] = await Promise.all([uploadUri(beforeUri!), uploadUri(afterUri!)])
        await postsApi.create({ type: 'BEFORE_AFTER', caption: caption.trim() || undefined, beforeUrl: bUrl, afterUrl: aUrl, visibility, bookingEnabled })
      } else {
        await postsApi.create({ type: 'TEXT', caption: caption.trim(), visibility, bookingEnabled })
      }
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to post. Please try again.')
    } finally {
      setPosting(false)
    }
  }, [tab, mediaUris, beforeUri, afterUri, caption, visibility, bookingEnabled, uploadUri])

  const TABS: Tab[] = ['PHOTO', 'BEFORE_AFTER', 'TEXT']

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text.primary }]}>New Post</Text>
        <TouchableOpacity
          onPress={() => void handlePost()}
          disabled={posting}
          style={[s.postBtn, { backgroundColor: theme.brand.primary, opacity: posting ? 0.5 : 1 }]}
        >
          {posting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.postBtnText}>Post</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {/* Type tabs */}
        <View style={[s.tabBar, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[s.tab, tab === t && { backgroundColor: theme.brand.primary }]}
            >
              <Text style={[s.tabText, { color: tab === t ? '#fff' : theme.text.secondary }]}>
                {t === 'BEFORE_AFTER' ? 'Before/After' : t.charAt(0) + t.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PHOTO tab */}
        {tab === 'PHOTO' && (
          <View style={s.section}>
            {mediaUris.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {mediaUris.map((uri, i) => (
                  <View key={i} style={{ marginRight: 8 }}>
                    <Image source={{ uri }} style={s.thumb} />
                    <TouchableOpacity
                      style={s.removeThumb}
                      onPress={() => setMediaUris((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity
              style={[s.pickArea, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
              onPress={() => void pickImages(true)}
            >
              <Ionicons name="images-outline" size={32} color={theme.brand.primary} />
              <Text style={[s.pickLabel, { color: theme.text.secondary }]}>
                {mediaUris.length > 0 ? 'Add more photos' : 'Choose photos'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BEFORE_AFTER tab */}
        {tab === 'BEFORE_AFTER' && (
          <View style={[s.section, s.baRow]}>
            <TouchableOpacity
              style={[s.baSlot, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
              onPress={() => void pickSingle(setBeforeUri)}
            >
              {beforeUri
                ? <Image source={{ uri: beforeUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                : <><Ionicons name="image-outline" size={28} color={theme.text.tertiary} /><Text style={[s.baLabel, { color: theme.text.tertiary }]}>Before</Text></>
              }
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={20} color={theme.text.tertiary} />
            <TouchableOpacity
              style={[s.baSlot, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
              onPress={() => void pickSingle(setAfterUri)}
            >
              {afterUri
                ? <Image source={{ uri: afterUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                : <><Ionicons name="image-outline" size={28} color={theme.text.tertiary} /><Text style={[s.baLabel, { color: theme.text.tertiary }]}>After</Text></>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* TEXT tab */}
        {tab === 'TEXT' && (
          <View style={s.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TEXT_BG_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setTextBg(c)}
                  style={[s.colorDot, { backgroundColor: c, borderWidth: textBg === c ? 3 : 0, borderColor: theme.brand.primary }]}
                />
              ))}
            </ScrollView>
            <View style={[s.textPreview, { backgroundColor: textBg }]}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Write something…"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                style={s.textInput}
                maxLength={2200}
              />
            </View>
          </View>
        )}

        {/* Caption (PHOTO + BEFORE_AFTER) */}
        {tab !== 'TEXT' && (
          <View style={[s.section, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle, paddingTop: 16 }]}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption… #hashtags supported"
              placeholderTextColor={theme.text.tertiary}
              multiline
              maxLength={2200}
              style={[s.captionInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
            />
          </View>
        )}

        {/* Options */}
        <View style={[s.section, { gap: 4 }]}>
          <Text style={[s.optLabel, { color: theme.text.secondary }]}>Visibility</Text>
          <View style={s.optRow}>
            {(['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as PostVisibility[]).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVisibility(v)}
                style={[s.optChip, { borderColor: visibility === v ? theme.brand.primary : theme.border.default, backgroundColor: visibility === v ? `${theme.brand.primary}18` : 'transparent' }]}
              >
                <Text style={[s.optChipText, { color: visibility === v ? theme.brand.primary : theme.text.secondary }]}>
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[s.toggleRow, { borderColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}
          onPress={() => setBookingEnabled((v) => !v)}
        >
          <View>
            <Text style={[s.toggleTitle, { color: theme.text.primary }]}>Enable booking button</Text>
            <Text style={[s.toggleSub, { color: theme.text.secondary }]}>Clients can book directly from this post</Text>
          </View>
          <View style={[s.toggle, { backgroundColor: bookingEnabled ? theme.brand.primary : theme.border.default }]}>
            <View style={[s.toggleKnob, { left: bookingEnabled ? 18 : 2 }]} />
          </View>
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { padding: 16, gap: 16 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  section: { gap: 12 },
  pickArea: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickLabel: { fontSize: 14, fontWeight: '600' },
  thumb: { width: 100, height: 100, borderRadius: 10 },
  removeThumb: { position: 'absolute', top: 4, right: 4 },
  baRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  baSlot: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  baLabel: { fontSize: 13, fontWeight: '600' },
  textPreview: {
    borderRadius: 12,
    minHeight: 160,
    padding: 16,
    justifyContent: 'center',
  },
  textInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  captionInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  optLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  optRow: { flexDirection: 'row', gap: 8 },
  optChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  optChipText: { fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  toggle: { width: 42, height: 24, borderRadius: 12, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
})
