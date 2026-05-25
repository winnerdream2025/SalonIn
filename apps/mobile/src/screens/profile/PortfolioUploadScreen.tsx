import React, { useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, Button, PortfolioGrid, useTheme } from '@salonin/ui'
import { workersApi } from '@salonin/api-client'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMediaUpload } from '../../hooks/useMediaUpload'

export default function PortfolioUploadScreen() {
  const { profile, isLoading, refetch } = useMyWorkerProfile()
  const { theme } = useTheme()

  const { pickAndUpload: pickImage, isUploading: isUploadingImage } = useMediaUpload({
    folder: 'portfolio',
    type: 'image',
  })
  const { pickAndUpload: pickVideo, isUploading: isUploadingVideo } = useMediaUpload({
    folder: 'portfolio',
    type: 'video',
  })

  const isUploading = isUploadingImage || isUploadingVideo

  const handleAddImage = useCallback(async () => {
    try {
      const url = await pickImage()
      if (!url) return
      await workersApi.addPortfolioItem({ mediaUrl: url, type: 'IMAGE' })
      refetch()
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.')
    }
  }, [pickImage, refetch])

  const handleAddVideo = useCallback(async () => {
    try {
      const url = await pickVideo()
      if (!url) return
      await workersApi.addPortfolioItem({ mediaUrl: url, type: 'VIDEO' })
      refetch()
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.')
    }
  }, [pickVideo, refetch])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text variant="body" color="brand">‹ Back</Text>
        </TouchableOpacity>
        <Text variant="title" style={styles.headerCenter}>Portfolio</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PortfolioGrid
          items={profile?.portfolioItems ?? []}
          onPressItem={() => {}}
          isLoading={isLoading}
        />

        {!isLoading && (profile?.portfolioItems.length ?? 0) === 0 && (
          <View style={styles.emptyHint}>
            <Text variant="body" color="secondary" style={styles.emptyText}>
              Add your first photo or video to showcase your work
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: theme.bg.base, borderTopColor: theme.border.default }]}>
        <Button
          variant="secondary"
          loading={isUploadingImage}
          onPress={handleAddImage}
          disabled={isUploading}
        >
          + Photo
        </Button>
        <Button
          variant="secondary"
          loading={isUploadingVideo}
          onPress={handleAddVideo}
          disabled={isUploading}
        >
          + Video
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 60 },
  headerCenter: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  emptyHint: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { textAlign: 'center' },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
