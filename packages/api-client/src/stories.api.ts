import { api } from './client'

export interface StoryUser {
  id: string
  workerProfile: { id: string; name: string; photoUrl: string | null } | null
  salonProfile: { id: string; name: string; photoUrls: string[] } | null
}

export interface Story {
  id: string
  userId: string
  mediaUrl?: string | null
  type: 'IMAGE' | 'VIDEO' | 'TEXT'
  caption?: string | null
  textContent?: string | null
  textBgColor?: string | null
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  bookingEnabled: boolean
  location?: string | null
  mentions: string[]
  createdAt: string
  expiresAt: string
  user: StoryUser
  _count: { views: number; likes: number; replies: number }
  views: { viewedAt: string }[]
  likes: { id: string }[]
}

export interface StoryGroup {
  userId: string
  name: string
  photoUrl: string | null
  hasUnseen: boolean
  stories: Story[]
}

export interface StoriesFeed {
  groups: StoryGroup[]
}

export interface StoryAnalytics {
  totalViews: number
  totalLikes: number
  totalReplies: number
  viewers: { viewedAt: string; viewer: StoryUser }[]
  likes: { createdAt: string; user: StoryUser }[]
  replies: { id: string; content: string; createdAt: string; user: StoryUser }[]
}

export type CreateStoryPayload = {
  mediaUrl?: string
  thumbnailUrl?: string
  type: 'IMAGE' | 'VIDEO' | 'TEXT'
  caption?: string
  textContent?: string
  textBgColor?: string
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  bookingEnabled?: boolean
  location?: string
  mentions?: string[]
}

export type UpdateStoryPayload = {
  caption?: string
  textContent?: string
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  bookingEnabled?: boolean
  location?: string
  mentions?: string[]
}

export const storiesApi = {
  create: (payload: CreateStoryPayload): Promise<Story> =>
    api.post<Story>('/stories', payload).then((r) => r.data),

  getFeed: (): Promise<StoriesFeed> =>
    api.get<StoriesFeed>('/stories/feed').then((r) => r.data),

  getMyStories: (): Promise<Story[]> =>
    api.get<Story[]>('/stories/my').then((r) => r.data),

  update: (storyId: string, payload: UpdateStoryPayload): Promise<Story> =>
    api.patch<Story>(`/stories/${storyId}`, payload).then((r) => r.data),

  deleteStory: (storyId: string): Promise<void> =>
    api.delete(`/stories/${storyId}`).then(() => undefined),

  viewStory: (storyId: string): Promise<void> =>
    api.post(`/stories/${storyId}/view`).then(() => undefined),

  toggleLike: (storyId: string): Promise<{ liked: boolean }> =>
    api.post<{ liked: boolean }>(`/stories/${storyId}/like`).then((r) => r.data),

  reply: (storyId: string, content: string): Promise<void> =>
    api.post(`/stories/${storyId}/reply`, { content }).then(() => undefined),

  getViewers: (storyId: string): Promise<{ viewedAt: string; viewer: StoryUser }[]> =>
    api.get(`/stories/${storyId}/viewers`).then((r) => r.data as { viewedAt: string; viewer: StoryUser }[]),

  getAnalytics: (storyId: string): Promise<StoryAnalytics> =>
    api.get<StoryAnalytics>(`/stories/${storyId}/analytics`).then((r) => r.data),
}

// ─── Story Highlights ───────────────────────────────────────────────────────
// Backed by the posts controller (`/posts/highlights`), whose responses are
// wrapped as `{ data: <payload> }`, so the axios body is `{ data: { data } }`.

export interface StoryHighlight {
  id: string
  userId: string
  title: string
  coverUrl: string | null
  storyIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateHighlightPayload {
  title: string
  coverUrl?: string
  storyIds?: string[]
}

export type UpdateHighlightPayload = Partial<CreateHighlightPayload>

function unwrapHighlight<T>(r: { data: { data: T } }): T {
  return r.data.data
}

export const highlightsApi = {
  getForUser: (userId: string): Promise<StoryHighlight[]> =>
    api.get(`/posts/highlights/user/${userId}`).then(unwrapHighlight<StoryHighlight[]>),

  create: (payload: CreateHighlightPayload): Promise<StoryHighlight> =>
    api.post('/posts/highlights', payload).then(unwrapHighlight<StoryHighlight>),

  update: (highlightId: string, payload: UpdateHighlightPayload): Promise<StoryHighlight> =>
    api.patch(`/posts/highlights/${highlightId}`, payload).then(unwrapHighlight<StoryHighlight>),

  remove: (highlightId: string): Promise<void> =>
    api.delete(`/posts/highlights/${highlightId}`).then(() => undefined),
}
