import { api, getAccessToken } from './client'

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

  // Use native fetch instead of Axios: Axios 1.x may not detect React Native's
  // FormData (toString returns '[object Object]') and JSON-serializes it to {},
  // sending an empty body to multer. fetch() sets the multipart boundary correctly.
  options?.onProgress?.(10)

  const token = getAccessToken()
  const baseURL = (api.defaults.baseURL ?? 'http://localhost:4000').replace(/\/$/, '')

  const response = await fetch(`${baseURL}/media/upload?folder=${folder}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  options?.onProgress?.(90)

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({} as Record<string, unknown>))
    const d = errorBody as { error?: string; message?: string | string[] }
    const msg =
      d.error ??
      (Array.isArray(d.message) ? d.message.join(', ') : d.message) ??
      `Upload failed (${response.status})`
    throw new Error(typeof msg === 'string' ? msg : 'Upload failed')
  }

  options?.onProgress?.(100)
  return response.json() as Promise<{ url: string }>
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
