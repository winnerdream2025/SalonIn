import { api } from './client'
import type { ConversationPreview, CursorResponse, Message } from '@salonin/types'

export const messagesApi = {
  createConversation: (otherUserId: string): Promise<ConversationPreview> =>
    api.post<ConversationPreview>('/conversations', { otherUserId }).then((r) => r.data),

  getConversations: (): Promise<ConversationPreview[]> =>
    api.get<ConversationPreview[]>('/conversations').then((r) => r.data),

  getMessages: (conversationId: string, cursor?: string): Promise<CursorResponse<Message>> =>
    api
      .get<CursorResponse<Message>>(`/conversations/${conversationId}/messages`, {
        params: cursor != null ? { cursor } : {},
      })
      .then((r) => r.data),

  sendMessage: (
    conversationId: string,
    content?: string,
    mediaUrl?: string,
  ): Promise<Message> =>
    api
      .post<Message>(`/conversations/${conversationId}/messages`, { content, mediaUrl })
      .then((r) => r.data),

  markAsRead: (conversationId: string): Promise<void> =>
    api.patch(`/conversations/${conversationId}/read`).then(() => undefined),
}
