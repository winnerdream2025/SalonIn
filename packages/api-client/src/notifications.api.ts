import { api } from './client'

export interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationsListResponse {
  data: NotificationItem[]
  total: number
  hasMore: boolean
}

export const notificationsApi = {
  list: (page = 1): Promise<NotificationsListResponse> =>
    api.get<NotificationsListResponse>('/notifications', { params: { page } }).then((r) => r.data),

  unreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`).then(() => undefined),

  markAllRead: (): Promise<void> =>
    api.patch('/notifications/read-all').then(() => undefined),

  delete: (id: string): Promise<void> =>
    api.delete(`/notifications/${id}`).then(() => undefined),
}
