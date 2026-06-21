import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ChatRequestStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { ConversationPreview, CursorResponse } from '@salonin/types'
import type { Message } from '@salonin/types'

const MESSAGES_LIMIT = 30
const MAX_PENDING_MESSAGES = 3

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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
        },
        lastMessage:
          lastMsg != null
            ? {
                content: lastMsg.content,
                mediaUrl: lastMsg.mediaUrl,
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

    const msgs = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor != null ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: MESSAGES_LIMIT + 1,
    })

    const hasMore = msgs.length > MESSAGES_LIMIT
    const data = hasMore ? msgs.slice(0, MESSAGES_LIMIT) : msgs
    const nextCursor =
      hasMore && data.length > 0
        ? (data[data.length - 1]?.createdAt.toISOString() ?? null)
        : null

    return { data: data as Message[], nextCursor, hasMore }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content?: string,
    mediaUrl?: string,
  ): Promise<Message> {
    if (!content && !mediaUrl) {
      throw new BadRequestException('Message must have content or media')
    }
    await this.assertParticipant(conversationId, senderId)

    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: senderId } },
    })
    if (other) {
      await this.enforceChatRequest(senderId, other.userId, conversationId)
    }

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content, mediaUrl },
    })

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    void this.notifyRecipient(conversationId, senderId, content)

    return message as Message
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
      const preview = content ?? '📷 Media'

      await this.notificationsService.notifyNewMessage(other.userId, senderName, preview, conversationId)
    } catch {
      // graceful fail
    }
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId)
    await this.prisma.message.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    })
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

    return {
      id: conv.id,
      otherParticipant: {
        userId: otherParticipant?.userId ?? '',
        name: otherUser?.workerProfile?.name ?? otherUser?.salonProfile?.name ?? 'Unknown',
        photoUrl:
          otherUser?.workerProfile?.photoUrl ?? otherUser?.salonProfile?.photoUrls[0] ?? null,
        role: otherUser?.role ?? 'WORKER',
      },
      lastMessage:
        lastMsg != null
          ? {
              content: lastMsg.content,
              mediaUrl: lastMsg.mediaUrl,
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
}
