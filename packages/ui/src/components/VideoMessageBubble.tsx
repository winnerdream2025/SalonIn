import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'

export interface VideoMessageBubbleProps {
  videoUrl: string
  thumbnailUrl?: string | null
  duration?: number | null
  isSelf: boolean
}

function formatDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoMessageBubble({ videoUrl, thumbnailUrl, duration, isSelf }: VideoMessageBubbleProps) {
  const { theme } = useTheme()
  const [playerOpen, setPlayerOpen] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)

  const openPlayer = useCallback(() => {
    setPlayerOpen(true)
    setVideoLoading(true)
  }, [])

  return (
    <>
      <Pressable onPress={openPlayer} style={styles.container}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderBg, { backgroundColor: isSelf ? 'rgba(0,0,0,0.25)' : theme.bg.elevated }]}>
            <Ionicons name="videocam" size={32} color={isSelf ? 'rgba(255,255,255,0.7)' : theme.text.secondary} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={20} color="#fff" />
          </View>
        </View>
        {duration != null && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={playerOpen} transparent animationType="fade" onRequestClose={() => setPlayerOpen(false)}>
        <View style={styles.modalBg}>
          <Pressable style={styles.modalClose} onPress={() => setPlayerOpen(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {/* Video player using Expo AV – loaded lazily */}
          <VideoPlayer url={videoUrl} onReady={() => setVideoLoading(false)} />
          {videoLoading && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
            </View>
          )}
        </View>
      </Modal>
    </>
  )
}

// Lazily import expo-av so the bundle stays small on screens that never play video
function VideoPlayer({ url, onReady }: { url: string; onReady: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Video, ResizeMode } = require('expo-av') as typeof import('expo-av')
  return (
    <Video
      source={{ uri: url }}
      style={styles.videoFull}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay
      onReadyForDisplay={onReady}
    />
  )
}

const styles = StyleSheet.create({
  container: { borderRadius: 10, overflow: 'hidden', width: 200, height: 150 },
  thumbnail: { width: 200, height: 150 },
  placeholderBg: { alignItems: 'center', justifyContent: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  videoFull: { width: '100%', height: 320 },
})
