import React from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@salonin/ui'

export type AttachmentType = 'image' | 'video' | 'document' | 'contact' | 'location'

interface Option {
  type: AttachmentType
  icon: string
  label: string
  color: string
}

const OPTIONS: Option[] = [
  { type: 'image',    icon: 'image-outline',    label: 'Photos',   color: '#5B8CF5' },
  { type: 'video',    icon: 'videocam-outline',  label: 'Video',    color: '#E0724A' },
  { type: 'document', icon: 'document-outline',  label: 'Document', color: '#5DBB8A' },
  { type: 'contact',  icon: 'person-outline',    label: 'Contact',  color: '#9B67E0' },
  { type: 'location', icon: 'location-outline',  label: 'Location', color: '#E0A030' },
]

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (type: AttachmentType) => void
}

export function AttachmentPicker({ visible, onClose, onSelect }: Props) {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.bg.card, paddingBottom: bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />
          <Text style={[styles.title, { color: theme.text.secondary }]}>Share</Text>
          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.optionBtn}
                activeOpacity={0.7}
                onPress={() => {
                  onClose()
                  onSelect(opt.type)
                }}
              >
                <View style={[styles.iconCircle, { backgroundColor: opt.color + '22' }]}>
                  <Ionicons name={opt.icon as any} size={26} color={opt.color} />
                </View>
                <Text style={[styles.optionLabel, { color: theme.text.primary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 18, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 16 },
  optionBtn: { alignItems: 'center', gap: 8, width: 64 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
})
