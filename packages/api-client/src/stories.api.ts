import { api } from './client'

export interface StoryUser {
  id: string
  workerProfile: { name: string; photoUrl: string | null } | null
  salonProfile: { name: string; photoUrls: string[] } | null
}

export interface Story {
  id: string
  userId: string
  mediaUrl: string
  type: 'IMAGE' | 'VIDEO'
  caption?: string | null
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

export const storiesApi = {
  create: (payload: { mediaUrl: string; type: 'IMAGE' | 'VIDEO'; caption?: string }): Promise<Story> =>
    api.post<Story>('/stories', payload).then((r) => r.data),

  getFeed: (): Promise<StoriesFeed> =>
    api.get<StoriesFeed>('/stories/feed').then((r) => r.data),

  getMyStories: (): Promise<Story[]> =>
    api.get<Story[]>('/stories/my').then((r) => r.data),

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
}
