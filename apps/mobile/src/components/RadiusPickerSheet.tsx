import React from 'react'
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text, useTheme } from '@salonin/ui'
import { useLocationStore } from '../store/locationStore'

export const RADIUS_PRESETS = [5, 10, 25, 50, 100]

interface RadiusPickerSheetProps {
  visible: boolean
  onClose: () => void
}

export function RadiusPickerSheet({ visible, onClose }: RadiusPickerSheetProps) {
  const { theme } = useTheme()
  const radiusMiles = useLocationStore((s) => s.radiusMiles)
  const setRadius = useLocationStore((s) => s.setRadius)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[s.sheet, { backgroundColor: theme.bg.card }]}>
        <View style={[s.handle, { backgroundColor: theme.border.default }]} />
        <Text style={[s.title, { color: theme.text.primary }]}>Search radius</Text>
        <Text style={[s.sub, { color: theme.text.secondary }]}>
          Show professionals within
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.presets}
        >
          {RADIUS_PRESETS.map((r) => {
            const active = r === radiusMiles
            return (
              <TouchableOpacity
                key={r}
                onPress={() => {
                  setRadius(r, 'custom')
                  onClose()
                }}
                activeOpacity={0.75}
                style={[
                  s.chip,
                  active
                    ? { backgroundColor: '#D85A30', borderColor: '#D85A30' }
                    : { backgroundColor: theme.bg.elevated, borderColor: theme.border.default },
                ]}
              >
                <Text style={[s.chipText, { color: active ? '#fff' : theme.text.secondary }]}>
                  {r} mi
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 20,
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
