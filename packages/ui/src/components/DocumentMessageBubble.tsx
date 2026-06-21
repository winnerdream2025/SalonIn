import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'

export interface DocumentMessageBubbleProps {
  fileUrl: string
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  isSelf: boolean
  onLongPress?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDocIcon(mimeType?: string | null): string {
  if (!mimeType) return 'document-outline'
  if (mimeType.includes('pdf')) return 'document-text-outline'
  if (mimeType.includes('word') || mimeType.includes('doc')) return 'document-outline'
  if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('csv')) return 'grid-outline'
  if (mimeType.includes('text')) return 'document-text-outline'
  return 'attach-outline'
}

export function DocumentMessageBubble({ fileUrl, fileName, fileSize, mimeType, isSelf, onLongPress }: DocumentMessageBubbleProps) {
  const { theme } = useTheme()
  const textColor = isSelf ? '#FFFFFF' : theme.text.primary
  const subColor = isSelf ? 'rgba(255,255,255,0.7)' : theme.text.secondary
  const iconBg = isSelf ? 'rgba(255,255,255,0.2)' : theme.bg.elevated

  return (
    <Pressable
      style={styles.row}
      onPress={() => void Linking.openURL(fileUrl)}
      onLongPress={onLongPress}
      delayLongPress={350}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={getDocIcon(mimeType) as any} size={24} color={textColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={2}>
          {fileName ?? 'Document'}
        </Text>
        {fileSize != null && (
          <Text style={[styles.size, { color: subColor }]}>{formatBytes(fileSize)}</Text>
        )}
      </View>
      <Ionicons name="download-outline" size={18} color={subColor} style={styles.dl} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180, maxWidth: 240 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  size: { fontSize: 11, marginTop: 2 },
  dl: { marginLeft: 4 },
})
