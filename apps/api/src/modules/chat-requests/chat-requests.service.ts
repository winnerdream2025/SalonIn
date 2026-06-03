import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ChatRequestStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { ChatRequestPreview } from '@salonin/types'

@Injectable()
export class ChatRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(senderId: string, receiverId: string): Promise<ChatRequestPreview> {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send a chat request to yourself')
    }

    const existing = await this.prisma.chatRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    })
    if (existing) {
      throw new ConflictException('Chat request already exists')
    }

    const req = await this.prisma.chatRequest.create({
      data: { senderId, receiverId },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })

    return this.toPreview(req)
  }

  async getReceived(userId: string): Promise<ChatRequestPreview[]> {
    const requests = await this.prisma.chatRequest.findMany({
      where: { receiverId: userId, status: ChatRequestStatus.PENDING },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return requests.map((r) => this.toPreview(r))
  }

  async respond(
    requestId: string,
    userId: string,
    action: 'ACCEPT' | 'DECLINE',
  ): Promise<ChatRequestPreview> {
    const req = await this.prisma.chatRequest.findUnique({
      where: { id: requestId },
    })
    if (!req) throw new NotFoundException('Chat request not found')
    if (req.receiverId !== userId) throw new ForbiddenException('Not your request to respond to')
    if (req.status !== ChatRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been responded to')
    }

    if (action === 'DECLINE') {
      const updated = await this.prisma.chatRequest.update({
        where: { id: requestId },
        data: { status: ChatRequestStatus.DECLINED },
        include: {
          sender: {
            select: {
              id: true,
              role: true,
              workerProfile: { select: { name: true, photoUrl: true } },
              salonProfile: { select: { name: true, photoUrls: true } },
            },
          },
        },
      })
      return this.toPreview(updated)
    }

    let conv = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.senderId } } },
          { participants: { some: { userId: req.receiverId } } },
        ],
      },
      select: { id: true },
    })

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: req.senderId }, { userId: req.receiverId }],
          },
        },
        select: { id: true },
      })
    }

    const updated = await this.prisma.chatRequest.update({
      where: { id: requestId },
      data: {
        status: ChatRequestStatus.ACCEPTED,
        conversationId: conv.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })

    return this.toPreview(updated)
  }

  private toPreview(req: {
    id: string
    senderId: string
    receiverId: string
    status: ChatRequestStatus
    messageCount: number
    conversationId: string | null
    createdAt: Date
    sender: {
      id: string
      role: string
      workerProfile: { name: string; photoUrl: string | null } | null
      salonProfile: { name: string; photoUrls: string[] } | null
    }
  }): ChatRequestPreview {
    return {
      id: req.id,
      senderId: req.senderId,
      receiverId: req.receiverId,
      status: req.status,
      messageCount: req.messageCount,
      conversationId: req.conversationId,
      createdAt: req.createdAt.toISOString(),
      sender: {
        id: req.sender.id,
        name:
          req.sender.workerProfile?.name ?? req.sender.salonProfile?.name ?? 'Unknown',
        photoUrl:
          req.sender.workerProfile?.photoUrl ??
          req.sender.salonProfile?.photoUrls[0] ??
          null,
        role: req.sender.role as import('@salonin/types').Role,
      },
    }
  }
}
