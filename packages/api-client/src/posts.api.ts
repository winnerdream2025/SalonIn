import { api } from './client'

// Posts endpoints wrap their payload as `{ data: <payload> }` in the HTTP body,
// so the axios response is `{ data: { data: <payload> } }`. Strip both levels.
function unwrap<T>(r: { data: { data: T } }): T {
  return r.data.data
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

export interface PostAuthor {
  id: string
  workerProfile: { name: string; photoUrl: string | null } | null
  salonProfile: { name: string; photoUrls: string[] } | null
  clientProfile: { name: string; photoUrl: string | null } | null
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
  updatedAt?: string
  user?: PostAuthor
  /** Non-empty when the current viewer has liked the post. */
  likes?: { id: string }[]
  hashtags?: { hashtag: { id: string; tag: string } }[]
}

export interface PostComment {
  id: string
  postId: string
  userId: string
  content: string
  parentId: string | null
  createdAt: string
  user?: PostAuthor
}

export interface TrendingHashtag {
  tag: string
  postCount: number
}

export interface FeedResponse {
  posts: PostData[]
  nextCursor: string | null
}

export interface ExploreResponse {
  posts: PostData[]
  nextCursor: string | null
  trendingHashtags: TrendingHashtag[]
}

export interface UserPostsResponse {
  data: PostData[]
  nextCursor: string | null
}

export interface CommentsResponse {
  data: PostComment[]
  nextCursor: string | null
}

export const postsApi = {
  create: (payload: CreatePostPayload): Promise<PostData> =>
    api.post('/posts', payload).then(unwrap<PostData>),

  getFeed: (cursor?: string): Promise<FeedResponse> =>
    api.get('/posts/feed', { params: cursor ? { cursor } : {} }).then(unwrap<FeedResponse>),

  getExplore: (hashtag?: string, cursor?: string): Promise<ExploreResponse> =>
    api.get('/posts/explore', { params: { ...(hashtag ? { hashtag } : {}), ...(cursor ? { cursor } : {}) } })
      .then(unwrap<ExploreResponse>),

  getUserPosts: (userId: string, cursor?: string): Promise<UserPostsResponse> =>
    api.get(`/posts/user/${userId}`, { params: cursor ? { cursor } : {} }).then(unwrap<UserPostsResponse>),

  getMyPosts: (): Promise<PostData[]> =>
    api.get('/posts/user/me').then((r) => (r as any).data ?? r),

  delete: (postId: string): Promise<void> =>
    api.delete(`/posts/${postId}`).then(() => undefined),

  like: (postId: string): Promise<void> =>
    api.post(`/posts/${postId}/like`).then(() => undefined),

  unlike: (postId: string): Promise<void> =>
    api.delete(`/posts/${postId}/like`).then(() => undefined),

  getComments: (postId: string, cursor?: string): Promise<CommentsResponse> =>
    api.get(`/posts/${postId}/comments`, { params: cursor ? { cursor } : {} }).then(unwrap<CommentsResponse>),

  addComment: (postId: string, content: string): Promise<PostComment> =>
    api.post(`/posts/${postId}/comments`, { content }).then(unwrap<PostComment>),
}
