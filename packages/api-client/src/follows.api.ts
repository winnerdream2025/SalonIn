import { api } from './client'

export interface FollowUser {
  id: string
  followersCount: number
  followingCount: number
  followedAt: string
  isFollowedBack?: boolean
  isFollowing?: boolean
  isOwnFollow?: boolean
  isOwnProfile?: boolean
  workerProfile: {
    name: string
    photoUrl: string | null
    specialties: string[]
    city: string | null
    state: string | null
    isVerified: boolean
    rating: number
  } | null
  salonProfile: {
    name: string
    photoUrls: string[]
    specialties: string[]
    city: string | null
    state: string | null
    isVerified: boolean
    rating: number
  } | null
}

export interface FollowListResponse {
  data: FollowUser[]
  nextCursor: string | null
}

export interface SuggestedUser {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[]
  city: string | null
  state: string | null
  isVerified: boolean
  rating: number
  type: 'worker' | 'salon'
  reason: 'mutual' | 'top_rated'
  followersCount: number
  reviewCount: number
  listingsCount: number
}

export const followsApi = {
  follow: (userId: string): Promise<{ following: boolean }> =>
    api.post<{ following: boolean }>(`/follows/${userId}`).then((r) => r.data),

  unfollow: (userId: string): Promise<{ following: boolean }> =>
    api.delete<{ following: boolean }>(`/follows/${userId}`).then((r) => r.data),

  isFollowing: (userId: string): Promise<{ following: boolean }> =>
    api.get<{ following: boolean }>(`/follows/${userId}/status`).then((r) => r.data),

  getFollowers: (userId: string, cursor?: string, search?: string): Promise<FollowListResponse> =>
    api.get<FollowListResponse>(`/follows/${userId}/followers`, { params: { cursor, search } }).then((r) => r.data),

  getFollowing: (userId: string, cursor?: string, search?: string): Promise<FollowListResponse> =>
    api.get<FollowListResponse>(`/follows/${userId}/following`, { params: { cursor, search } }).then((r) => r.data),

  removeFollower: (followerId: string): Promise<void> =>
    api.delete(`/follows/${followerId}/remove-follower`).then(() => undefined),

  getSuggestions: (): Promise<SuggestedUser[]> =>
    api.get<SuggestedUser[]>('/follows/suggestions/me').then((r) => r.data),
}
