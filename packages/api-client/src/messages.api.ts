import { api } from './client'
import type { ConversationPreview, CursorResponse, Message, ReactionEmoji, UserPresence } from '@salonin/types'

export const messagesApi = {
  createConversation: (otherUserId: string): Promise<ConversationPreview> =>
    api.post<ConversationPreview>('/conversations', { otherUserId }).then((r) => r.data),

  getConversations: (search?: string): Promise<ConversationPreview[]> =>
    api
      .get<ConversationPreview[]>('/conversations', {
        params: search != null ? { search } : {},
      })
      .then((r) => r.data),

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
    replyToId?: string,
    audioUrl?: string,
    duration?: number,
    waveformData?: number[],
  ): Promise<Message> =>
    api
      .post<Message>(`/conversations/${conversationId}/messages`, { content, mediaUrl, replyToId, audioUrl, duration, waveformData })
      .then((r) => r.data),

  uploadAudio: async (uri: string, mimeType = 'audio/m4a'): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', { uri, name: 'voice.m4a', type: mimeType } as unknown as Blob)
    return api
      .post<{ url: string }>('/media/upload?folder=voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  editMessage: (conversationId: string, messageId: string, content: string): Promise<Message> =>
    api
      .patch<Message>(`/conversations/${conversationId}/messages/${messageId}`, { content })
      .then((r) => r.data),

  deleteMessage: (conversationId: string, messageId: string, mode: 'me' | 'all'): Promise<void> =>
    api
      .delete(`/conversations/${conversationId}/messages/${messageId}`, { data: { mode } })
      .then(() => undefined),

  reactToMessage: (conversationId: string, messageId: string, emoji: ReactionEmoji): Promise<Message> =>
    api
      .post<Message>(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji })
      .then((r) => r.data),

  markAsRead: (conversationId: string): Promise<void> =>
    api.patch(`/conversations/${conversationId}/read`).then(() => undefined),

  pinConversation: (conversationId: string, isPinned: boolean): Promise<void> =>
    api
      .patch(`/conversations/${conversationId}/pin`, { isPinned })
      .then(() => undefined),

  archiveConversation: (conversationId: string, isArchived: boolean): Promise<void> =>
    api
      .patch(`/conversations/${conversationId}/archive`, { isArchived })
      .then(() => undefined),

  muteConversation: (conversationId: string, isMuted: boolean): Promise<void> =>
    api
      .patch(`/conversations/${conversationId}/mute`, { isMuted })
      .then(() => undefined),

  deleteConversation: (conversationId: string): Promise<void> =>
    api.delete(`/conversations/${conversationId}`).then(() => undefined),

  getPresence: (userId: string): Promise<UserPresence> =>
    api.get<UserPresence>(`/conversations/presence/${userId}`).then((r) => r.data),
}
