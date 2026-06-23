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
import { Video, ResizeMode } from 'expo-av'
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
  const [previewPlaying, setPreviewPlaying] = useState(true)
  const [showLocationInput, setShowLocationInput] = useState(false)

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
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setMediaUri(asset.uri)
      setMediaType(asset.type === 'video' ? 'VIDEO' : 'IMAGE')
      setPreviewPlaying(true)
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
      setPreviewPlaying(true)
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
    setPreviewPlaying(true)
    setShowLocationInput(false)
    setTab('gallery')
    onClose()
  }

  // ── Preview screen (WhatsApp-style full-screen) ─────────────────────────

  if (showPreview || (tab === 'text' && textContent.length > 0)) {
    const canPost = tab === 'text' ? textContent.trim().length > 0 : mediaUri != null
    const isVideoPreview = mediaType === 'VIDEO'
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.pvScreen}>
          {/* ── Full-screen media ── */}
          {tab === 'text' ? (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: textBgColor, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
              <Text style={styles.textPreviewContent}>{textContent}</Text>
            </View>
          ) : isVideoPreview && mediaUri ? (
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setPreviewPlaying((p) => !p)}>
              <Video
                source={{ uri: mediaUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode={ResizeMode.COVER}
                shouldPlay={previewPlaying}
                isLooping
                volume={1.0}
              />
              {!previewPlaying && (
                <View style={styles.pvPlayOverlay}>
                  <View style={styles.pvPlayCircle}>
                    <Ionicons name="play" size={38} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ) : mediaUri ? (
            <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : null}

          {/* ── Top gradient ── */}
          <View style={styles.pvTopGrad} pointerEvents="none" />

          {/* ── Header: back + Share button ── */}
          <View style={[styles.pvHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              style={styles.pvBackBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handlePost()}
              disabled={!canPost || uploading}
              style={[styles.pvSendBtn, (!canPost || uploading) && { opacity: 0.4 }]}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.pvSendText}>Share</Text>
                  <Ionicons name="send" size={15} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Bottom gradient ── */}
          <View style={styles.pvBottomGrad} pointerEvents="none" />

          {/* ── Bottom controls ── */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.pvBottom, { paddingBottom: insets.bottom + 14 }]}
          >
            {/* Location input (shown when chip tapped) */}
            {showLocationInput && (
              <View style={styles.pvLocationRow}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.pvLocationInput}
                  placeholder="Tag a location…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={location}
                  onChangeText={setLocation}
                  autoFocus
                  maxLength={100}
                  returnKeyType="done"
                  onSubmitEditing={() => setShowLocationInput(false)}
                  onBlur={() => setShowLocationInput(false)}
                />
                <TouchableOpacity onPress={() => { setLocation(''); setShowLocationInput(false) }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            )}

            {/* Caption input */}
            <View style={styles.pvCaptionRow}>
              <TextInput
                style={styles.pvCaptionInput}
                placeholder="Add a caption…"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={caption}
                onChangeText={setCaption}
                maxLength={300}
              />
            </View>

            {/* Option chips: location · visibility · booking */}
            <View style={styles.pvChipsRow}>
              <TouchableOpacity
                style={[styles.pvChip, location.length > 0 && styles.pvChipActive]}
                onPress={() => setShowLocationInput((l) => !l)}
                activeOpacity={0.75}
              >
                <Ionicons name="location-outline" size={13} color="#fff" />
                <Text style={styles.pvChipText} numberOfLines={1}>
                  {location.length > 0 ? location : 'Location'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pvChip}
                onPress={() => {
                  const opts: Visibility[] = ['PUBLIC', 'FOLLOWERS', 'PRIVATE']
                  setVisibility(opts[(opts.indexOf(visibility) + 1) % opts.length]!)
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="eye-outline" size={13} color="#fff" />
                <Text style={styles.pvChipText}>
                  {visibility === 'PUBLIC' ? 'Everyone' : visibility === 'FOLLOWERS' ? 'Followers' : 'Only me'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pvChip, bookingEnabled && styles.pvChipActive]}
                onPress={() => setBookingEnabled((b) => !b)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.pvChipText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
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
  // Text preview (used inside full-screen text story preview)
  textPreviewContent: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ── Full-screen preview (WhatsApp-style) ──────────────────────────────────
  pvScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  pvTopGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pvBottomGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pvHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  pvBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D85A30',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 96,
    justifyContent: 'center',
  },
  pvSendText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pvBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 8,
  },
  pvLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pvLocationInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  pvCaptionRow: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  pvCaptionInput: {
    color: '#fff',
    fontSize: 15,
  },
  pvChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pvChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pvChipActive: {
    backgroundColor: 'rgba(216,90,48,0.85)',
    borderColor: '#D85A30',
  },
  pvChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 110,
  },
  pvPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvPlayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
})
