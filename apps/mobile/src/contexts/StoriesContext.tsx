/**
 * StoriesContext — global brain for the stories system.
 *
 * Wraps the whole app so every screen/component can:
 *   1. Know whether a given userId has an active story (hasStory / hasUnseen)
 *   2. Open the viewer for any userId (or group index)
 *   3. Open the creator sheet
 *
 * StoryViewer and StoryCreator modals live here — one instance, no duplication.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { storiesApi } from '@salonin/api-client'
import type { StoryGroup } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'
import { StoryViewer } from '../components/StoryViewer'
import { StoryCreator } from '../components/StoryCreator'

// ─── Public shape ─────────────────────────────────────────────────────────────

export interface UserStoryState {
  hasStory: boolean
  hasUnseen: boolean
  group: StoryGroup
}

interface StoriesCtx {
  /** Map of userId → story state. Empty while loading. */
  storyMap: Map<string, UserStoryState>
  /** Ordered groups for the stories bar (all users, own first if present). */
  allGroups: StoryGroup[]
  /** Your own group (null if you have no active stories). */
  myGroup: StoryGroup | null
  isLoading: boolean
  refresh: () => Promise<void>
  /** Open the viewer starting at the group that belongs to userId. */
  openViewerForUser: (userId: string) => void
  /** Open the viewer at a specific group array index. */
  openViewerAtIndex: (index: number, groups?: StoryGroup[]) => void
  /** Open the story creator sheet. */
  openCreator: () => void
  /** Mark a story as viewed (optimistic update on the map). */
  markViewed: (storyId: string, userId: string) => void
}

const Ctx = createContext<StoriesCtx | null>(null)

export function useStories(): StoriesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStories must be inside StoriesProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const [storyMap, setStoryMap] = useState<Map<string, UserStoryState>>(new Map())
  const [allGroups, setAllGroups] = useState<StoryGroup[]>([])
  const [myGroup, setMyGroup] = useState<StoryGroup | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Viewer state
  const [viewerGroups, setViewerGroups] = useState<StoryGroup[]>([])
  const [viewerStartIdx, setViewerStartIdx] = useState(0)
  const [viewerVisible, setViewerVisible] = useState(false)

  // Creator state
  const [creatorVisible, setCreatorVisible] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const [feed, mine] = await Promise.all([
        storiesApi.getFeed(),
        storiesApi.getMyStories(),
      ])
      if (!mountedRef.current) return

      // Build storyMap
      const map = new Map<string, UserStoryState>()
      for (const g of feed.groups) {
        map.set(g.userId, {
          hasStory: g.stories.length > 0,
          hasUnseen: g.hasUnseen,
          group: g,
        })
      }

      // My group (separate fetch — feed may or may not include own)
      let ownGroup: StoryGroup | null = null
      if (mine.length > 0) {
        const name =
          (user as unknown as { workerProfile?: { name: string }; salonProfile?: { name: string } })
            .workerProfile?.name ??
          (user as unknown as { workerProfile?: { name: string }; salonProfile?: { name: string } })
            .salonProfile?.name ??
          'My Story'
        ownGroup = {
          userId: user.id,
          name,
          photoUrl: null,
          hasUnseen: false,
          stories: mine,
        }
        map.set(user.id, { hasStory: true, hasUnseen: false, group: ownGroup })
      }

      const others = feed.groups.filter((g) => g.userId !== user.id)
      const ordered = ownGroup ? [ownGroup, ...others] : others

      setStoryMap(map)
      setAllGroups(ordered)
      setMyGroup(ownGroup)
    } catch {
      // stories are non-critical — fail silently
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [user])

  // Load on mount / user change
  useEffect(() => { void refresh() }, [refresh])

  const openViewerForUser = useCallback(
    (userId: string) => {
      const idx = allGroups.findIndex((g) => g.userId === userId)
      if (idx < 0) return
      setViewerGroups(allGroups)
      setViewerStartIdx(idx)
      setViewerVisible(true)
    },
    [allGroups],
  )

  const openViewerAtIndex = useCallback(
    (index: number, groups?: StoryGroup[]) => {
      const g = groups ?? allGroups
      setViewerGroups(g)
      setViewerStartIdx(Math.min(index, g.length - 1))
      setViewerVisible(true)
    },
    [allGroups],
  )

  const openCreator = useCallback(() => setCreatorVisible(true), [])

  const markViewed = useCallback((storyId: string, userId: string) => {
    setStoryMap((prev) => {
      const entry = prev.get(userId)
      if (!entry) return prev
      const updatedStories = entry.group.stories.map((s) =>
        s.id === storyId ? { ...s, views: [{ viewedAt: new Date().toISOString() }] } : s,
      )
      const stillUnseen = updatedStories.some((s) => s.views.length === 0)
      const updatedGroup: StoryGroup = { ...entry.group, stories: updatedStories, hasUnseen: stillUnseen }
      const next = new Map(prev)
      next.set(userId, { ...entry, hasUnseen: stillUnseen, group: updatedGroup })
      return next
    })
    void storiesApi.viewStory(storyId).catch(() => {})
  }, [])

  const value: StoriesCtx = {
    storyMap,
    allGroups,
    myGroup,
    isLoading,
    refresh,
    openViewerForUser,
    openViewerAtIndex,
    openCreator,
    markViewed,
  }

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Single global StoryViewer — mounted at app root, no duplication */}
      <StoryViewer
        visible={viewerVisible}
        groups={viewerGroups}
        startGroupIndex={viewerStartIdx}
        onClose={() => setViewerVisible(false)}
        onViewed={markViewed}
      />

      {/* Single global StoryCreator */}
      <StoryCreator
        visible={creatorVisible}
        onClose={() => setCreatorVisible(false)}
        onCreated={() => void refresh()}
      />
    </Ctx.Provider>
  )
}
