import { api } from './client'

export interface MediaFile {
  uri: string
  mimeType: string
  name: string
}

export type MediaFolder = 'avatars' | 'portfolio' | 'uploads' | 'spaces' | 'voice' | 'documents' | 'videos'

export interface UploadOptions {
  onProgress?: (percent: number) => void
}

async function uploadMedia(
  file: MediaFile,
  folder: MediaFolder = 'uploads',
  options?: UploadOptions,
): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', { uri: file.uri, type: file.mimeType, name: file.name } as unknown as Blob)

  const { data } = await api.post<{ url: string }>(`/media/upload?folder=${folder}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options?.onProgress
      ? (e) => {
          const total = e.total ?? 1
          options.onProgress!(Math.round((e.loaded / total) * 100))
        }
      : undefined,
  })
  return data
}

async function uploadMultiple(
  files: MediaFile[],
  folder: MediaFolder = 'uploads',
  options?: { onProgress?: (fileIndex: number, percent: number) => void },
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!
    const { url } = await uploadMedia(file, folder, {
      onProgress: options?.onProgress ? (pct) => options.onProgress!(i, pct) : undefined,
    })
    urls.push(url)
  }
  return urls
}

export const mediaApi = { uploadMedia, uploadMultiple }
