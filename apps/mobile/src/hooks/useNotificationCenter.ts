import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import * as Notifications from 'expo-notifications'
import { notificationsApi, type NotificationItem } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

const POLL_INTERVAL_MS = 30_000

interface UseNotificationCenterResult {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useNotificationCenter(): UseNotificationCenterResult {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCount = useCallback(async () => {
    if (!user) return
    try {
      const { count } = await notificationsApi.unreadCount()
      setUnreadCount(count)
      await Notifications.setBadgeCountAsync(count)
    } catch {
      // graceful fail
    }
  }, [user])

  const fetchList = useCallback(async (reset = false) => {
    if (!user) return
    const nextPage = reset ? 1 : page
    setLoading(true)
    try {
      const res = await notificationsApi.list(nextPage)
      setNotifications((prev) => (reset ? res.data : [...prev, ...res.data]))
      setHasMore(res.hasMore)
      setPage(reset ? 2 : nextPage + 1)
      const unread = res.data.filter((n) => !n.isRead).length
      if (reset) {
        const countRes = await notificationsApi.unreadCount()
        setUnreadCount(countRes.count)
        await Notifications.setBadgeCountAsync(countRes.count)
      } else if (unread > 0) {
        setUnreadCount((prev) => prev + unread)
      }
    } catch {
      // graceful fail
    } finally {
      setLoading(false)
    }
  }, [user, page])

  const refresh = useCallback(async () => {
    setPage(1)
    await fetchList(true)
  }, [fetchList])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchList(false)
  }, [hasMore, loading, fetchList])

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      await fetchCount()
    } catch {
      // graceful fail
    }
  }, [fetchCount])

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
      await Notifications.setBadgeCountAsync(0)
    } catch {
      // graceful fail
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await notificationsApi.delete(id)
      const removed = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (removed && !removed.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // graceful fail
    }
  }, [notifications])

  useEffect(() => {
    if (!user) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    pollRef.current = setInterval(() => { void fetchCount() }, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [user, fetchCount])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchCount()
    })
    return () => sub.remove()
  }, [fetchCount])

  return { notifications, unreadCount, loading, hasMore, refresh, loadMore, markRead, markAllRead, remove }
}
