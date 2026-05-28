import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text as RNText,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import FastImage from 'react-native-fast-image'
import * as Sharing from 'expo-sharing'
import { useTheme } from '@salonin/ui'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function PortfolioViewScreen() {
  const { url } = useLocalSearchParams<{ url: string }>()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)

  const imageUrl = url ? decodeURIComponent(url) : null

  const handleShare = async () => {
    if (!imageUrl) return
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(imageUrl, { dialogTitle: 'Share photo' })
      }
    } catch {
      // silently ignore
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <RNText style={styles.headerBtnText}>‹ Back</RNText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void handleShare()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <RNText style={styles.headerBtnText}>Share</RNText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        centerContent
        bouncesZoom
      >
        {imageUrl ? (
          <FastImage
            source={{ uri: imageUrl, priority: FastImage.priority.high }}
            style={styles.image}
            resizeMode={FastImage.resizeMode.contain}
            onLoadEnd={() => setIsLoading(false)}
          />
        ) : null}
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.brand.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { padding: 4 },
  headerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.78,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})
