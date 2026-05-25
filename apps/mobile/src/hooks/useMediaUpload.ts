import { useState, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { mediaApi } from '@salonin/api-client'
import type { MediaFolder } from '@salonin/api-client'

export type MediaUploadType = 'image' | 'video' | 'any'

export interface UseMediaUploadOptions {
  folder?: MediaFolder
  type?: MediaUploadType
  allowsEditing?: boolean
}

export interface UseMediaUploadResult {
  pickAndUpload: () => Promise<string | null>
  isUploading: boolean
}

export function useMediaUpload({
  folder = 'uploads',
  type = 'image',
  allowsEditing = false,
}: UseMediaUploadOptions = {}): UseMediaUploadResult {
  const [isUploading, setIsUploading] = useState(false)

  const pickAndUpload = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return null

    const mediaTypes =
      type === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : type === 'any'
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing,
      quality: 0.9,
    })

    if (result.canceled) return null

    const asset = result.assets?.[0]
    if (!asset) return null

    const mimeType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
    const ext = mimeType.split('/')[1] ?? 'jpg'
    const name = asset.fileName ?? `upload.${ext}`

    setIsUploading(true)
    try {
      const { url } = await mediaApi.uploadMedia({ uri: asset.uri, mimeType, name }, folder)
      return url
    } finally {
      setIsUploading(false)
    }
  }, [folder, type, allowsEditing])

  return { pickAndUpload, isUploading }
}
