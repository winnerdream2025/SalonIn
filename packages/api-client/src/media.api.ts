import { api } from './client'

export interface MediaFile {
  uri: string
  mimeType: string
  name: string
}

export type MediaFolder = 'avatars' | 'portfolio' | 'uploads'

async function uploadMedia(file: MediaFile, folder: MediaFolder = 'uploads'): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', { uri: file.uri, type: file.mimeType, name: file.name } as unknown as Blob)

  const { data } = await api.post<{ url: string }>(`/media/upload?folder=${folder}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const mediaApi = { uploadMedia }
