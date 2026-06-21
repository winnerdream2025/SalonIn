import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ChatRequestStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PresenceService } from './presence.service'
import type { ConversationPreview, CursorResponse, Reaction } from '@salonin/types'
import type { Message } from '@salonin/types'

type MessageWithReactions = Prisma.MessageGetPayload<{
  include: {
    replyTo: {
      select: {
        id: true
        senderId: true
        content: true
        mediaUrl: true
        isDeletedForAll: true
      }
    }
  }
}> & { reactions: Prisma.JsonValue | null }

const MESSAGES_LIMIT = 30
const MAX_PENDING_MESSAGES = 3

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly presenceService: PresenceService,
  ) {}

  async createConversation(requesterId: string, otherUserId: string): Promise<ConversationPreview> {
    if (requesterId === otherUserId) {
      throw new BadRequestException('Cannot message yourself')
    }

    let conv = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: requesterId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      select: { id: true },
    })

    if (conv === null) {
      conv = await this.prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: requesterId }, { userId: otherUserId }],
          },
        },
        select: { id: true },
      })
    }

    return this.buildPreview(conv.id, requesterId)
  }

  async getConversations(userId: string, search?: string): Promise<ConversationPreview[]> {
    const searchFilter = search
      ? {
          OR: [
            {
              participants: {
                some: {
                  user: { workerProfile: { name: { contains: search, mode: 'insensitive' as const } } },
                },
              },
            },
            {
              participants: {
                some: {
                  user: { salonProfile: { name: { contains: search, mode: 'insensitive' as const } } },
                },
              },
            },
            { messages: { some: { content: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : undefined

    const convs = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } }, ...searchFilter },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                workerProfile: { select: { name: true, photoUrl: true } },
                salonProfile: { select: { name: true, photoUrls: true } },
              },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        isRead: false,
        senderId: { not: userId },
        conversationId: { in: convs.map((c) => c.id) },
      },
      _count: { _all: true },
    })

    const otherUserIds = convs
      .map((conv) => conv.participants.find((p) => p.userId !== userId)?.userId)
      .filter((id): id is string => id != null)
    const presenceMap = await this.presenceService.getPresenceBulk(otherUserIds)

    const previews = convs.map((conv) => {
      const myParticipant = conv.participants.find((p) => p.userId === userId)
      const otherParticipant = conv.participants.find((p) => p.userId !== userId)
      const unread = unreadCounts.find((u) => u.conversationId === conv.id)?._count._all ?? 0
      const otherUser = otherParticipant?.user
      const lastMsg = conv.messages[0]
      return {
        id: conv.id,
        otherParticipant: {
          userId: otherParticipant?.userId ?? '',
          name: otherUser?.workerProfile?.name ?? otherUser?.salonProfile?.name ?? 'Unknown',
          photoUrl:
            otherUser?.workerProfile?.photoUrl ?? otherUser?.salonProfile?.photoUrls[0] ?? null,
          role: otherUser?.role ?? 'WORKER',
          presence: presenceMap[otherParticipant?.userId ?? ''],
        },
        lastMessage:
          lastMsg != null
            ? {
                content: lastMsg.content,
                mediaUrl: lastMsg.mediaUrl,
                type: lastMsg.type,
                status: lastMsg.status as Message['status'],
                createdAt: lastMsg.createdAt.toISOString(),
                isRead: lastMsg.isRead,
                senderId: lastMsg.senderId,
              }
            : null,
        unreadCount: unread,
        isArchived: myParticipant?.isArchived ?? false,
        isPinned: myParticipant?.isPinned ?? false,
        isMuted: myParticipant?.isMuted ?? false,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
      }
    })

    return previews.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }

  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
  ): Promise<CursorResponse<Message>> {
    await this.assertParticipant(conversationId, userId)

    const deletedMessageIds = await this.prisma.deletedMessage.findMany({
      where: { userId, message: { conversationId } },
      select: { messageId: true },
    })
    const deletedIds = new Set(deletedMessageIds.map((d) => d.messageId))

    const msgs = await this.prisma.message.findMany({
      where: {
        conversationId,
        isDeletedForAll: false,
        ...(cursor != null ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: MESSAGES_LIMIT + 1,
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            isDeletedForAll: true,
          },
        },
      },
    })

    const hasMore = msgs.length > MESSAGES_LIMIT
    const data = hasMore ? msgs.slice(0, MESSAGES_LIMIT) : msgs
    const nextCursor =
      hasMore && data.length > 0
        ? (data[data.length - 1]?.createdAt.toISOString() ?? null)
        : null

    const filtered = data.filter((m) => !deletedIds.has(m.id))
    return { data: filtered.map((m) => this.serializeMessage(m as MessageWithReactions)), nextCursor, hasMore }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    opts: {
      content?: string
      mediaUrl?: string
      mediaUrls?: string[]
      thumbnailUrl?: string
      replyToId?: string
      audioUrl?: string
      duration?: number
      waveformData?: number[]
      fileName?: string
      fileSize?: number
      mimeType?: string
      contactName?: string
      contactPhone?: string
      latitude?: number
      longitude?: number
      locationName?: string
      type?: string
    } = {},
  ): Promise<Message> {
    const {
      content, mediaUrl, mediaUrls, thumbnailUrl, replyToId,
      audioUrl, duration, waveformData,
      fileName, fileSize, mimeType,
      contactName, contactPhone,
      latitude, longitude, locationName,
      type: explicitType,
    } = opts

    const hasContent = content != null && content.length > 0
    const hasMedia = mediaUrl != null || (mediaUrls != null && mediaUrls.length > 0)
    const hasAudio = audioUrl != null
    const hasContact = contactName != null
    const hasLocation = latitude != null && longitude != null

    if (!hasContent && !hasMedia && !hasAudio && !hasContact && !hasLocation && fileName == null) {
      throw new BadRequestException('Message must have content, media, audio, contact, or location')
    }

    await this.assertParticipant(conversationId, senderId)

    if (replyToId) {
      const parent = await this.prisma.message.findFirst({ where: { id: replyToId, conversationId } })
      if (!parent) throw new BadRequestException('Reply message not found in this conversation')
    }

    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: senderId } },
    })
    if (other) {
      await this.enforceChatRequest(senderId, other.userId, conversationId)
    }

    const messageType =
      explicitType ??
      (hasAudio ? 'VOICE'
        : hasContact ? 'CONTACT'
        : hasLocation ? 'LOCATION'
        : fileName != null ? 'DOCUMENT'
        : mediaUrls != null && mediaUrls.length > 0 ? 'IMAGE'
        : mediaUrl != null ? 'MEDIA'
        : 'TEXT')

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        mediaUrl: mediaUrl ?? (mediaUrls?.[0] ?? null),
        mediaUrls: mediaUrls ? (mediaUrls as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        thumbnailUrl,
        audioUrl,
        duration,
        waveformData: waveformData ? (waveformData as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        fileName,
        fileSize,
        mimeType,
        contactName,
        contactPhone,
        latitude,
        longitude,
        locationName,
        type: messageType,
        status: 'sent',
        replyToId,
      },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            isDeletedForAll: true,
          },
        },
      },
    })

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    const notifyPreview =
      hasAudio ? '🎤 Voice message'
        : messageType === 'IMAGE' ? '🖼 Image'
        : messageType === 'VIDEO' ? '🎥 Video'
        : messageType === 'DOCUMENT' ? `📎 ${fileName ?? 'Document'}`
        : messageType === 'CONTACT' ? `👤 ${contactName}`
        : messageType === 'LOCATION' ? `📍 ${locationName ?? 'Location'}`
        : undefined

    void this.notifyRecipient(conversationId, senderId, content, notifyPreview)

    return this.serializeMessage(message as MessageWithReactions)
  }

  private async enforceChatRequest(
    senderId: string,
    receiverId: string,
    conversationId: string,
  ): Promise<void> {
    let req = await this.prisma.chatRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    })

    if (!req) {
      await this.prisma.chatRequest.create({
        data: {
          senderId,
          receiverId,
          status: ChatRequestStatus.PENDING,
          messageCount: 1,
          conversationId,
        },
      })
      return
    }

    if (req.status === ChatRequestStatus.ACCEPTED) return

    if (req.status === ChatRequestStatus.DECLINED) {
      throw new ForbiddenException('Chat request was declined')
    }

    if (req.senderId !== senderId) {
      throw new ForbiddenException('Accept the request before replying')
    }

    if (req.messageCount >= MAX_PENDING_MESSAGES) {
      throw new ForbiddenException(
        JSON.stringify({ blocked: true, reason: 'REQUEST_PENDING' }),
      )
    }

    await this.prisma.chatRequest.update({
      where: { id: req.id },
      data: { messageCount: { increment: 1 } },
    })
  }

  private async notifyRecipient(
    conversationId: string,
    senderId: string,
    content?: string,
    voicePreview?: string,
  ): Promise<void> {
    try {
      const other = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: senderId } },
      })
      if (!other || other.isMuted) return

      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: {
          workerProfile: { select: { name: true } },
          salonProfile: { select: { name: true } },
        },
      })
      const senderName =
        sender?.workerProfile?.name ?? sender?.salonProfile?.name ?? 'Someone'
      const preview = voicePreview ?? content ?? '📷 Media'

      await this.notificationsService.notifyNewMessage(other.userId, senderName, preview, conversationId)
    } catch {
      // graceful fail
    }
  }

  async markAsRead(conversationId: string, userId: string): Promise<string[]> {
    await this.assertParticipant(conversationId, userId)
    const messages = await this.prisma.message.findMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      select: { id: true },
    })
    if (messages.length === 0) return []

    await this.prisma.message.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { isRead: true, status: 'read', readAt: new Date() },
    })
    return messages.map((m) => m.id)
  }

  async markAsDelivered(
    conversationId: string,
    userId: string,
    messageIds: string[],
  ): Promise<string[]> {
    await this.assertParticipant(conversationId, userId)
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        id: { in: messageIds },
        status: { not: 'read' },
      },
      select: { id: true },
    })
    if (messages.length === 0) return []

    await this.prisma.message.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { status: 'delivered', deliveredAt: new Date() },
    })
    return messages.map((m) => m.id)
  }

  async pinConversation(conversationId: string, userId: string, isPinned: boolean): Promise<void> {
    await this.assertParticipant(conversationId, userId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: {
        isPinned,
        pinnedAt: isPinned ? new Date() : null,
      },
    })
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<void> {
    await this.assertParticipant(conversationId, userId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    })
  }

  async muteConversation(conversationId: string, userId: string, isMuted: boolean): Promise<void> {
    await this.assertParticipant(conversationId, userId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isMuted },
    })
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId)
    await this.prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    })
  }

  private async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!participant) throw new ForbiddenException('Not a participant in this conversation')
  }

  private async buildPreview(conversationId: string, userId: string): Promise<ConversationPreview> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                workerProfile: { select: { name: true, photoUrl: true } },
                salonProfile: { select: { name: true, photoUrls: true } },
              },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!conv) throw new NotFoundException('Conversation not found')

    const myParticipant = conv.participants.find((p) => p.userId === userId)
    const otherParticipant = conv.participants.find((p) => p.userId !== userId)
    const unread = await this.prisma.message.count({
      where: { conversationId, isRead: false, senderId: { not: userId } },
    })

    const otherUser = otherParticipant?.user
    const lastMsg = conv.messages[0]
    const otherPresence = otherParticipant?.userId
      ? await this.presenceService.getPresence(otherParticipant.userId)
      : undefined

    return {
      id: conv.id,
      otherParticipant: {
        userId: otherParticipant?.userId ?? '',
        name: otherUser?.workerProfile?.name ?? otherUser?.salonProfile?.name ?? 'Unknown',
        photoUrl:
          otherUser?.workerProfile?.photoUrl ?? otherUser?.salonProfile?.photoUrls[0] ?? null,
        role: otherUser?.role ?? 'WORKER',
        presence: otherPresence,
      },
      lastMessage:
        lastMsg != null
          ? {
              content: lastMsg.content,
              mediaUrl: lastMsg.mediaUrl,
              type: lastMsg.type,
              status: lastMsg.status as Message['status'],
              createdAt: lastMsg.createdAt.toISOString(),
              isRead: lastMsg.isRead,
              senderId: lastMsg.senderId,
            }
          : null,
      unreadCount: unread,
      isArchived: myParticipant?.isArchived ?? false,
      isPinned: myParticipant?.isPinned ?? false,
      isMuted: myParticipant?.isMuted ?? false,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    }
  }

  async updateMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    content: string,
  ): Promise<Message> {
    await this.assertParticipant(conversationId, userId)
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, senderId: userId, isDeletedForAll: false },
    })
    if (!message) throw new NotFoundException('Message not found')

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            isDeletedForAll: true,
          },
        },
      },
    })
    return this.serializeMessage(updated as MessageWithReactions)
  }

  async reactToMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    emoji: string,
  ): Promise<Message> {
    await this.assertParticipant(conversationId, userId)
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, isDeletedForAll: false },
    })
    if (!message) throw new NotFoundException('Message not found')

    const current = ((message.reactions as Prisma.JsonValue) as unknown as Reaction[] | undefined) ?? []
    const existing = current.find((r) => r.userId === userId)
    const typedEmoji = emoji as Reaction['emoji']
    let next: Reaction[]
    if (existing) {
      if (existing.emoji === typedEmoji) {
        next = current.filter((r) => r.userId !== userId)
      } else {
        next = current.map((r) => (r.userId === userId ? { userId, emoji: typedEmoji } : r))
      }
    } else {
      next = [...current, { userId, emoji: typedEmoji }]
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { reactions: next as unknown as Prisma.InputJsonValue },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            isDeletedForAll: true,
          },
        },
      },
    })
    return this.serializeMessage(updated as MessageWithReactions)
  }

  async deleteMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    mode: 'me' | 'all',
  ): Promise<{ success: true; deletedForAll: boolean }> {
    await this.assertParticipant(conversationId, userId)
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
    })
    if (!message) throw new NotFoundException('Message not found')

    if (mode === 'all') {
      if (message.senderId !== userId) {
        throw new ForbiddenException('Only the sender can delete for everyone')
      }
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          isDeletedForAll: true,
          deletedAt: new Date(),
          content: null,
          mediaUrl: null,
          mediaUrls: Prisma.JsonNull,
          thumbnailUrl: null,
          audioUrl: null,
          fileName: null,
          contactName: null,
          contactPhone: null,
          latitude: null,
          longitude: null,
          locationName: null,
        },
      })
      return { success: true, deletedForAll: true }
    }

    await this.prisma.deletedMessage.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId },
      update: {},
    })
    return { success: true, deletedForAll: false }
  }

  private serializeMessage(raw: MessageWithReactions): Message {
    const reactions = ((raw.reactions as Prisma.JsonValue) as unknown as Reaction[] | undefined) ?? []
    const waveform = raw.waveformData ? (raw.waveformData as unknown as number[]) : null
    const mediaUrls = (raw as unknown as Record<string, unknown>).mediaUrls
      ? ((raw as unknown as Record<string, unknown>).mediaUrls as string[])
      : null
    return {
      ...raw,
      waveformData: waveform,
      mediaUrls,
      createdAt: raw.createdAt.toISOString(),
      deliveredAt: raw.deliveredAt?.toISOString() ?? null,
      readAt: raw.readAt?.toISOString() ?? null,
      reactions,
      isEdited: raw.isEdited ?? false,
      editedAt: raw.editedAt?.toISOString() ?? null,
      isDeletedForAll: raw.isDeletedForAll ?? false,
      deletedAt: raw.deletedAt?.toISOString() ?? null,
      deletedForUserIds: undefined,
      replyTo: raw.replyTo
        ? {
            id: raw.replyTo.id,
            senderId: raw.replyTo.senderId,
            content: raw.replyTo.isDeletedForAll ? 'Deleted message' : raw.replyTo.content,
            mediaUrl: raw.replyTo.isDeletedForAll ? null : raw.replyTo.mediaUrl,
            isDeletedForAll: raw.replyTo.isDeletedForAll,
          }
        : null,
    } as Message
  }
}
