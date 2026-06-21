import { useCallback, useEffect, useRef, useState } from 'react'
import { followsApi } from '@salonin/api-client'
import type { FollowUser, SuggestedUser } from '@salonin/api-client'

export function useFollow(targetUserId: string | undefined) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!targetUserId) return
    followsApi.isFollowing(targetUserId).then((r) => {
      if (mountedRef.current) setIsFollowing(r.following)
    }).catch(() => {})
  }, [targetUserId])

  const toggle = useCallback(async () => {
    if (!targetUserId || isLoading) return
    setIsLoading(true)
    // Optimistic
    const prev = isFollowing
    setIsFollowing(!prev)
    try {
      if (prev) {
        await followsApi.unfollow(targetUserId)
      } else {
        await followsApi.follow(targetUserId)
      }
    } catch {
      if (mountedRef.current) setIsFollowing(prev)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [targetUserId, isFollowing, isLoading])

  return { isFollowing, isLoading, toggle }
}

export function useFollowers(userId: string | undefined) {
  const [data, setData] = useState<FollowUser[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async (cursor?: string, searchTerm?: string) => {
    if (!userId) return
    setIsLoading(true)
    try {
      const res = await followsApi.getFollowers(userId, cursor, searchTerm)
      if (!mountedRef.current) return
      if (cursor) {
        setData((prev) => [...prev, ...res.data])
      } else {
        setData(res.data)
      }
      setNextCursor(res.nextCursor)
    } catch {
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { void load(undefined, search) }, [load, search])

  const loadMore = useCallback(() => {
    if (nextCursor) void load(nextCursor, search)
  }, [nextCursor, load, search])

  const onSearch = useCallback((text: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearch(text), 300)
  }, [])

  const removeFollower = useCallback(async (followerId: string) => {
    await followsApi.removeFollower(followerId)
    setData((prev) => prev.filter((u) => u.id !== followerId))
  }, [])

  const toggleFollowBack = useCallback(async (targetId: string, currentlyFollowing: boolean) => {
    if (currentlyFollowing) {
      await followsApi.unfollow(targetId)
    } else {
      await followsApi.follow(targetId)
    }
    setData((prev) =>
      prev.map((u) => u.id === targetId ? { ...u, isFollowedBack: !currentlyFollowing } : u)
    )
  }, [])

  return { data, isLoading, loadMore, hasMore: Boolean(nextCursor), onSearch, removeFollower, toggleFollowBack }
}

export function useFollowing(userId: string | undefined) {
  const [data, setData] = useState<FollowUser[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async (cursor?: string, searchTerm?: string) => {
    if (!userId) return
    setIsLoading(true)
    try {
      const res = await followsApi.getFollowing(userId, cursor, searchTerm)
      if (!mountedRef.current) return
      if (cursor) {
        setData((prev) => [...prev, ...res.data])
      } else {
        setData(res.data)
      }
      setNextCursor(res.nextCursor)
    } catch {
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { void load(undefined, search) }, [load, search])

  const loadMore = useCallback(() => {
    if (nextCursor) void load(nextCursor, search)
  }, [nextCursor, load, search])

  const onSearch = useCallback((text: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearch(text), 300)
  }, [])

  const toggleFollow = useCallback(async (targetId: string, currentlyFollowing: boolean) => {
    if (currentlyFollowing) {
      await followsApi.unfollow(targetId)
    } else {
      await followsApi.follow(targetId)
    }
    setData((prev) =>
      prev.map((u) => u.id === targetId ? { ...u, isFollowing: !currentlyFollowing } : u)
    )
  }, [])

  return { data, isLoading, loadMore, hasMore: Boolean(nextCursor), onSearch, toggleFollow }
}

export function useSuggestedUsers() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    followsApi.getSuggestions().then(setSuggestions).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  return { suggestions, isLoading }
}
