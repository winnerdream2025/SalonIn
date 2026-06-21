import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@salonin/ui'
import { mediaApi, storiesApi } from '@salonin/api-client'

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

export function StoryCreator({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets()
  const [mediaUri, setMediaUri] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE')
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow media library access.')
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
    }
  }

  const handlePost = async () => {
    if (!mediaUri) return
    setUploading(true)
    try {
      const folder = mediaType === 'VIDEO' ? 'videos' : 'uploads'
      const mimeType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
      const ext = mediaType === 'VIDEO' ? 'mp4' : 'jpg'
      const { url } = await mediaApi.uploadMedia(
        { uri: mediaUri, mimeType, name: `story.${ext}` },
        folder,
      )
      await storiesApi.create({ mediaUrl: url, type: mediaType, caption: caption.trim() || undefined })
      setMediaUri(null)
      setCaption('')
      onCreated()
      onClose()
    } catch (e) {
      Alert.alert('Error', 'Failed to post story. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setMediaUri(null)
    setCaption('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={reset}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={reset} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>New Story</Text>
          {mediaUri ? (
            <TouchableOpacity
              onPress={() => void handlePost()}
              style={[styles.postBtn, uploading && { opacity: 0.5 }]}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.postBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <TouchableOpacity style={styles.pickBtn} onPress={() => void pick()} activeOpacity={0.8}>
              <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.pickText}>Tap to choose a photo or video</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Caption */}
        {mediaUri && (
          <View style={[styles.captionRow, { paddingBottom: insets.bottom + 16 }]}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
              multiline
            />
            {!mediaUri && (
              <TouchableOpacity onPress={() => void pick()} style={styles.changeBtn}>
                <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  postBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    flex: 1,
  },
  pickBtn: {
    alignItems: 'center',
    gap: 12,
  },
  pickText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  captionInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    maxHeight: 80,
  },
  changeBtn: {
    padding: 8,
  },
})
