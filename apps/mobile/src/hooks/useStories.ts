import { useCallback, useEffect, useRef, useState } from 'react'
import { storiesApi } from '@salonin/api-client'
import type { StoryGroup } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

export function useStories() {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [myStories, setMyStories] = useState<StoryGroup | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async (refresh = false) => {
    if (!user) return
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const [feed, mine] = await Promise.all([
        storiesApi.getFeed(),
        storiesApi.getMyStories(),
      ])
      if (!mountedRef.current) return
      setGroups(feed.groups.filter((g) => g.userId !== user.id))
      if (mine.length > 0) {
        const name = (user as unknown as { name?: string }).name ?? 'My Story'
        setMyStories({
          userId: user.id,
          name,
          photoUrl: null,
          hasUnseen: false,
          stories: mine,
        })
      } else {
        setMyStories(null)
      }
    } catch {
      // silently fail — story bar is non-critical
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const refresh = useCallback(() => load(true), [load])

  const markViewed = useCallback(async (storyId: string) => {
    await storiesApi.viewStory(storyId).catch(() => {})
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) =>
          s.id === storyId ? { ...s, views: [{ viewedAt: new Date().toISOString() }] } : s
        ),
        hasUnseen: g.stories.some((s) => s.id !== storyId && s.views.length === 0),
      }))
    )
  }, [])

  return { groups, myStories, isLoading, isRefreshing, refresh, markViewed }
}
