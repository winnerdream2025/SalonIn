import { api } from './client'

function unwrap<T>(r: { data: T }): T {
  return r.data
}

export type PostType = 'PHOTO' | 'VIDEO' | 'BEFORE_AFTER' | 'TEXT'
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

export interface CreatePostPayload {
  type: PostType
  caption?: string
  mediaUrls?: string[]
  beforeUrl?: string
  afterUrl?: string
  serviceId?: string
  visibility?: PostVisibility
  bookingEnabled?: boolean
}

export interface PostData {
  id: string
  userId: string
  type: PostType
  caption: string | null
  mediaUrls: string[]
  beforeUrl: string | null
  afterUrl: string | null
  serviceId: string | null
  visibility: PostVisibility
  bookingEnabled: boolean
  likesCount: number
  commentsCount: number
  createdAt: string
}

export const postsApi = {
  create: (payload: CreatePostPayload): Promise<PostData> =>
    api.post('/posts', payload).then(unwrap<PostData>),

  getMyPosts: (): Promise<PostData[]> =>
    api.get('/posts/user/me').then((r) => (r as any).data ?? r),

  delete: (postId: string): Promise<void> =>
    api.delete(`/posts/${postId}`).then(() => undefined),

  like: (postId: string): Promise<void> =>
    api.post(`/posts/${postId}/like`).then(() => undefined),
}
