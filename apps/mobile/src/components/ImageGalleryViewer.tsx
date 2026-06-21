import React, { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface Props {
  images: string[]
  initialIndex?: number
  visible: boolean
  onClose: () => void
}

export function ImageGalleryViewer({ images, initialIndex = 0, visible, onClose }: Props) {
  const { top, bottom } = useSafeAreaInsets()
  const [index, setIndex] = useState(initialIndex)
  const listRef = useRef<FlatList>(null)

  const onViewableChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const first = viewableItems[0]
    if (first?.index != null) setIndex(first.index)
  }, [])

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: top + 8 }]}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.counter}>{index + 1} / {images.length}</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Images */}
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onViewableItemsChanged={onViewableChanged}
          viewabilityConfig={viewabilityConfig.current}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Dots */}
        {images.length > 1 && (
          <View style={[styles.dots, { paddingBottom: bottom + 16 }]}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  counter: { color: '#fff', fontSize: 15, fontWeight: '600' },
  page: { width: SCREEN_W, height: SCREEN_H - 160, justifyContent: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H - 160 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotActive: { backgroundColor: '#fff' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.35)' },
})
