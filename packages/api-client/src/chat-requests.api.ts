import { api } from './client'
import type { ChatRequestPreview } from '@salonin/types'

export const chatRequestsApi = {
  create: (receiverId: string): Promise<ChatRequestPreview> =>
    api.post<ChatRequestPreview>('/chat-requests', { receiverId }).then((r) => r.data),

  getReceived: (): Promise<ChatRequestPreview[]> =>
    api.get<ChatRequestPreview[]>('/chat-requests/received').then((r) => r.data),

  respond: (id: string, action: 'ACCEPT' | 'DECLINE'): Promise<ChatRequestPreview> =>
    api.patch<ChatRequestPreview>(`/chat-requests/${id}`, { action }).then((r) => r.data),
}
