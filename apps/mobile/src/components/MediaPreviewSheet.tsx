import React, { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export interface MediaPreviewItem {
  uri: string
  type: 'image' | 'video'
  mimeType: string
  name: string
  fileSize?: number
}

interface Props {
  visible: boolean
  items: MediaPreviewItem[]
  isUploading: boolean
  uploadProgress: number   // 0–100
  onClose: () => void
  onSend: (caption: string) => void
  onRemove?: (index: number) => void
}

export function MediaPreviewSheet({ visible, items, isUploading, uploadProgress, onClose, onSend, onRemove }: Props) {
  const { bottom } = useSafeAreaInsets()
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState(0)

  const currentItem = items[selected]

  const handleSend = () => {
    onSend(caption.trim())
    setCaption('')
  }

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: '#000' }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 52 }]}>
          <Pressable style={styles.headerBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {items.length === 1 ? (currentItem?.type === 'video' ? 'Video' : 'Photo') : `${items.length} items`}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Preview */}
        <View style={styles.previewArea}>
          {currentItem?.type === 'video' ? (
            <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.videoLabel}>{currentItem.name}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: currentItem?.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Thumbnail strip (multi-select) */}
        {items.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
            {items.map((item, i) => (
              <Pressable key={i} onPress={() => setSelected(i)} style={[styles.thumb, i === selected && styles.thumbSelected]}>
                {item.type === 'video' ? (
                  <View style={[styles.thumbInner, { backgroundColor: '#222' }]}>
                    <Ionicons name="play" size={16} color="#fff" />
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.thumbInner} resizeMode="cover" />
                )}
                {onRemove && (
                  <Pressable style={styles.removeThumb} onPress={() => onRemove(i)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#fff" />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Caption + Send */}
        <View style={[styles.footer, { paddingBottom: bottom + 12 }]}>
          <TextInput
            style={[styles.captionInput, { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, isUploading && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={isUploading || items.length === 0}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <View style={styles.progressCircle}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  videoPreview: { alignItems: 'center', gap: 12 },
  videoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  strip: { maxHeight: 76 },
  stripContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  thumb: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbSelected: { borderColor: '#D85A30' },
  thumbInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  removeThumb: { position: 'absolute', top: 2, right: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  captionInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: { alignItems: 'center' },
  progressText: { color: '#fff', fontSize: 9, marginTop: 1 },
})
