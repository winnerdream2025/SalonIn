import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { ConversationPreview, CursorResponse } from '@salonin/types'
import type { Message } from '@salonin/types'

const MESSAGES_LIMIT = 30

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createConversation(requesterId: string, otherUserId: string): Promise<ConversationPreview> {
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

  async getConversations(userId: string): Promise<ConversationPreview[]> {
    const convs = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          where: { userId: { not: userId } },
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
      orderBy: { createdAt: 'desc' },
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

    return convs.map((conv) => {
      const unread = unreadCounts.find((u) => u.conversationId === conv.id)?._count._all ?? 0
      const otherUser = conv.participants[0]?.user
      const lastMsg = conv.messages[0]
      return {
        id: conv.id,
        otherParticipant: {
          userId: conv.participants[0]?.userId ?? '',
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
        createdAt: conv.createdAt.toISOString(),
      }
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

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content, mediaUrl },
    })

    void this.notifyRecipient(conversationId, senderId, content)

    return message as Message
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
      if (!other) return

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

      await this.notificationsService.notifyNewMessage(other.userId, senderName, preview)
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
          where: { userId: { not: userId } },
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

    const unread = await this.prisma.message.count({
      where: { conversationId, isRead: false, senderId: { not: userId } },
    })

    const otherUser = conv.participants[0]?.user
    const lastMsg = conv.messages[0]

    return {
      id: conv.id,
      otherParticipant: {
        userId: conv.participants[0]?.userId ?? '',
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
      createdAt: conv.createdAt.toISOString(),
    }
  }
}
