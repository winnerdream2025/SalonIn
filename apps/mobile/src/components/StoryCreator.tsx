/**
 * StoryCreator — full-screen story composition modal.
 *
 * Tabs:
 *   Gallery  — pick photo or video from library
 *   Camera   — take photo or record video via ImagePicker launchCameraAsync
 *   Text     — text-only story with colored background
 *
 * Preview screen lets the user add caption, choose visibility,
 * tag a location, and optionally enable a booking CTA before posting.
 */
import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@salonin/ui'
import { mediaApi, storiesApi } from '@salonin/api-client'

const { width: SW } = Dimensions.get('window')

const TEXT_BG_COLORS = [
  '#1A1A2E', '#16213E', '#0F3460', '#533483',
  '#D85A30', '#C0392B', '#27AE60', '#2980B9',
  '#8E44AD', '#E67E22', '#1ABC9C', '#2C3E50',
]

type Tab = 'gallery' | 'camera' | 'text'
type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

export function StoryCreator({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets()

  // Tab selection
  const [tab, setTab] = useState<Tab>('gallery')

  // Media state (gallery / camera)
  const [mediaUri, setMediaUri] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE')

  // Text story state
  const [textContent, setTextContent] = useState('')
  const [textBgColor, setTextBgColor] = useState(TEXT_BG_COLORS[0]!)

  // Metadata (shared)
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [location, setLocation] = useState('')
  const [bookingEnabled, setBookingEnabled] = useState(false)

  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ── Pickers ─────────────────────────────────────────────────────────────

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow media library access in Settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsEditing: true,
      aspect: [9, 16],
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setMediaUri(asset.uri)
      setMediaType(asset.type === 'video' ? 'VIDEO' : 'IMAGE')
      setShowPreview(true)
    }
  }, [])

  const openCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsEditing: false,
      videoMaxDuration: 30,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setMediaUri(asset.uri)
      setMediaType(asset.type === 'video' ? 'VIDEO' : 'IMAGE')
      setShowPreview(true)
    }
  }, [])

  // ── Post ─────────────────────────────────────────────────────────────────

  const handlePost = useCallback(async () => {
    setUploading(true)
    try {
      if (tab === 'text') {
        if (!textContent.trim()) return
        await storiesApi.create({
          type: 'TEXT',
          textContent: textContent.trim(),
          textBgColor,
          caption: caption.trim() || undefined,
          visibility,
          bookingEnabled,
          location: location.trim() || undefined,
        })
      } else {
        if (!mediaUri) return
        const folder = mediaType === 'VIDEO' ? 'videos' : 'uploads'
        const mimeType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
        const ext = mediaType === 'VIDEO' ? 'mp4' : 'jpg'
        const { url } = await mediaApi.uploadMedia(
          { uri: mediaUri, mimeType, name: `story.${ext}` },
          folder,
        )
        await storiesApi.create({
          mediaUrl: url,
          type: mediaType,
          caption: caption.trim() || undefined,
          visibility,
          bookingEnabled,
          location: location.trim() || undefined,
        })
      }
      onCreated()
      handleClose()
    } catch {
      Alert.alert('Error', 'Failed to post story. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [tab, textContent, textBgColor, mediaUri, mediaType, caption, visibility, bookingEnabled, location, onCreated])

  const handleClose = () => {
    setMediaUri(null)
    setTextContent('')
    setCaption('')
    setLocation('')
    setBookingEnabled(false)
    setVisibility('PUBLIC')
    setShowPreview(false)
    setTab('gallery')
    onClose()
  }

  // ── Preview screen ──────────────────────────────────────────────────────

  if (showPreview || (tab === 'text' && textContent.length > 0)) {
    const canPost = tab === 'text' ? textContent.trim().length > 0 : mediaUri != null
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.screen, { paddingTop: insets.top }]}>
            {/* Preview area */}
            <View style={styles.previewArea}>
              {tab === 'text' ? (
                <View style={[styles.textPreview, { backgroundColor: textBgColor }]}>
                  <Text style={styles.textPreviewContent}>{textContent || 'Your story text...'}</Text>
                </View>
              ) : mediaUri != null ? (
                <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />
              ) : null}

              {/* Caption overlay */}
              {caption.length > 0 && (
                <View style={styles.captionOverlay}>
                  <Text style={styles.captionOverlayText}>{caption}</Text>
                </View>
              )}

              {/* Booking badge overlay */}
              {bookingEnabled && (
                <View style={styles.bookingOverlay}>
                  <Ionicons name="calendar" size={14} color="#fff" />
                  <Text style={styles.bookingOverlayText}>Book Now</Text>
                </View>
              )}
            </View>

            {/* Editing panel */}
            <ScrollView
              style={[styles.editPanel, { backgroundColor: '#0D0D0D' }]}
              contentContainerStyle={[styles.editPanelContent, { paddingBottom: insets.bottom + 16 }]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header row */}
              <View style={styles.editHeader}>
                <TouchableOpacity onPress={() => setShowPreview(false)} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.editTitle}>Preview</Text>
                <TouchableOpacity
                  onPress={() => void handlePost()}
                  disabled={!canPost || uploading}
                  style={[styles.shareBtn, (!canPost || uploading) && { opacity: 0.4 }]}
                >
                  {uploading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.shareBtnText}>Share</Text>}
                </TouchableOpacity>
              </View>

              {/* Caption input */}
              <View style={styles.editRow}>
                <Ionicons name="text" size={16} color="#999" />
                <TextInput
                  style={styles.editInput}
                  placeholder="Add a caption…"
                  placeholderTextColor="#555"
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={300}
                  multiline
                />
              </View>

              {/* Location */}
              <View style={styles.editRow}>
                <Ionicons name="location-outline" size={16} color="#999" />
                <TextInput
                  style={styles.editInput}
                  placeholder="Add location…"
                  placeholderTextColor="#555"
                  value={location}
                  onChangeText={setLocation}
                  maxLength={100}
                />
              </View>

              {/* Visibility */}
              <View style={styles.editRow}>
                <Ionicons name="eye-outline" size={16} color="#999" />
                <Text style={styles.editLabel}>Audience</Text>
                <View style={styles.visibilityGroup}>
                  {(['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as Visibility[]).map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setVisibility(v)}
                      style={[
                        styles.visibilityChip,
                        visibility === v && styles.visibilityChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.visibilityChipText,
                        visibility === v && styles.visibilityChipTextActive,
                      ]}>
                        {v === 'PUBLIC' ? 'Everyone' : v === 'FOLLOWERS' ? 'Followers' : 'Only me'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Booking CTA toggle */}
              <TouchableOpacity
                style={styles.editRow}
                onPress={() => setBookingEnabled((b) => !b)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color="#999" />
                <Text style={styles.editLabel}>Enable "Book Now" CTA</Text>
                <View style={[
                  styles.toggle,
                  { backgroundColor: bookingEnabled ? '#D85A30' : '#333' },
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    { transform: [{ translateX: bookingEnabled ? 18 : 2 }] },
                  ]} />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  // ── Main creator screen ─────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Story</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['gallery', 'camera', 'text'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabItem, tab === t && styles.tabItemActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t === 'gallery' ? 'images-outline' : t === 'camera' ? 'camera-outline' : 'text'}
                size={18}
                color={tab === t ? '#fff' : '#666'}
              />
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area */}
        <View style={styles.content}>
          {tab === 'gallery' && (
            <TouchableOpacity style={styles.pickArea} onPress={() => void pickFromGallery()} activeOpacity={0.8}>
              <View style={styles.pickIcon}>
                <Ionicons name="images" size={48} color="rgba(255,255,255,0.35)" />
              </View>
              <Text style={styles.pickTitle}>Choose from Library</Text>
              <Text style={styles.pickSub}>Photos and videos up to 30 seconds</Text>
              <View style={styles.pickBtn}>
                <Text style={styles.pickBtnText}>Open Gallery</Text>
              </View>
            </TouchableOpacity>
          )}

          {tab === 'camera' && (
            <TouchableOpacity style={styles.pickArea} onPress={() => void openCamera()} activeOpacity={0.8}>
              <View style={styles.pickIcon}>
                <Ionicons name="camera" size={48} color="rgba(255,255,255,0.35)" />
              </View>
              <Text style={styles.pickTitle}>Take a Photo or Video</Text>
              <Text style={styles.pickSub}>Hold to record up to 30 seconds</Text>
              <View style={styles.pickBtn}>
                <Text style={styles.pickBtnText}>Open Camera</Text>
              </View>
            </TouchableOpacity>
          )}

          {tab === 'text' && (
            <View style={styles.textCreator}>
              {/* Live preview */}
              <View style={[styles.textCanvas, { backgroundColor: textBgColor }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your story…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={textContent}
                  onChangeText={setTextContent}
                  maxLength={500}
                  multiline
                  textAlignVertical="center"
                  textAlign="center"
                  autoFocus
                />
              </View>

              {/* Color picker */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorPicker}
                contentContainerStyle={styles.colorPickerContent}
              >
                {TEXT_BG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setTextBgColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      textBgColor === c && styles.colorDotActive,
                    ]}
                  />
                ))}
              </ScrollView>

              {/* Continue to preview */}
              {textContent.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => setShowPreview(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueBtnText}>Continue →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#D85A30',
  },
  tabLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  pickArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  pickIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  pickBtn: {
    marginTop: 16,
    backgroundColor: '#D85A30',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  pickBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  textCreator: {
    flex: 1,
  },
  textCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  textInput: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    width: SW - 48,
    minHeight: 80,
  },
  colorPicker: {
    height: 60,
    flexGrow: 0,
  },
  colorPickerContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  continueBtn: {
    margin: 16,
    backgroundColor: '#D85A30',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Preview / Edit panel
  previewArea: {
    height: 340,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  textPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textPreviewContent: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  captionOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bookingOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D85A30',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bookingOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  editPanel: {
    flex: 1,
  },
  editPanelContent: {
    padding: 16,
    gap: 4,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  editTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  shareBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
  },
  editLabel: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
  },
  editInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  visibilityGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  visibilityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  visibilityChipActive: {
    backgroundColor: '#D85A30',
    borderColor: '#D85A30',
  },
  visibilityChipText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  visibilityChipTextActive: {
    color: '#fff',
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
})
