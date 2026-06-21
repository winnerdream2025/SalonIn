import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Server, Socket } from 'socket.io'
import { PrismaService } from '../../prisma/prisma.service'
import { MessagingService } from './messaging.service'
import { PresenceService } from './presence.service'
import type { UserPresence } from '@salonin/types'

const TYPING_TIMEOUT_MS = 2000

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly messagingService: MessagingService,
    private readonly presenceService: PresenceService,
  ) {}

  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined
    if (!userId) return

    void client.join(`user:${userId}`)
    void this.presenceService.markOnline(userId, client.id).then((presence) => {
      if (presence) this.broadcastPresence(presence)
    })
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined
    if (!userId) return

    void this.presenceService.markOffline(userId, client.id).then((presence) => {
      if (presence) this.broadcastPresence(presence)
    })
  }

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
        if (!token) return next(new Error('Unauthorized'))

        const payload = this.jwtService.verify(token, {
          secret: this.config.getOrThrow<string>('JWT_SECRET'),
        })
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        })
        if (!user || !user.isActive) return next(new Error('Unauthorized'))

        socket.data.userId = user.id
        next()
      } catch {
        next(new Error('Unauthorized'))
      }
    })
  }

  @SubscribeMessage('join:conversation')
  async handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.data.userId
    if (!userId) throw new UnauthorizedException()

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
    })
    if (!participant) throw new UnauthorizedException('Not a participant')

    void client.join(`conv:${data.conversationId}`)
  }

  @SubscribeMessage('leave:conversation')
  handleLeave(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    void client.leave(`conv:${data.conversationId}`)
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.data.userId as string | undefined
    if (!userId) return

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
    })
    if (!participant) return

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
      },
    })
    const name = user?.workerProfile?.name ?? user?.salonProfile?.name ?? 'Someone'

    this.server.to(`conv:${data.conversationId}`).emit('typing', { userId, name, isTyping: true })
    this.resetTypingTimeout(data.conversationId, userId, name)
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.data.userId as string | undefined
    if (!userId) return

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
      },
    })
    const name = user?.workerProfile?.name ?? user?.salonProfile?.name ?? 'Someone'

    this.clearTypingTimeout(data.conversationId, userId)
    this.server.to(`conv:${data.conversationId}`).emit('typing', { userId, name, isTyping: false })
  }

  @SubscribeMessage('presence:heartbeat')
  async handlePresenceHeartbeat(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined
    if (!userId) return
    await this.presenceService.heartbeat(userId)
  }

  @SubscribeMessage('presence:subscribe')
  async handlePresenceSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const currentUserId = client.data.userId as string | undefined
    if (!currentUserId || data.userId === currentUserId) return

    void client.join(`presence:${data.userId}`)
    const presence = await this.presenceService.getPresence(data.userId)
    client.emit('presence:update', presence)
  }

  @SubscribeMessage('presence:unsubscribe')
  handlePresenceUnsubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    void client.leave(`presence:${data.userId}`)
  }

  broadcastMessage(conversationId: string, message: unknown): void {
    this.server.to(`conv:${conversationId}`).emit('message:received', message)
  }

  async broadcastNewMessage(
    conversationId: string,
    senderId: string,
    message: unknown,
  ): Promise<void> {
    this.server.to(`conv:${conversationId}`).emit('message:received', message)

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    })

    for (const p of participants) {
      if (p.userId !== senderId) {
        this.server.to(`user:${p.userId}`).emit('message:new', {
          conversationId,
          senderId,
          content: (message as { content?: string }).content,
          createdAt: (message as { createdAt?: string }).createdAt,
        })
      }
    }
  }

  broadcastMessageStatus(
    conversationId: string,
    messageIds: string[],
    status: 'delivered' | 'read',
  ): void {
    const timestamp = new Date().toISOString()
    this.server.to(`conv:${conversationId}`).emit('message:status', {
      conversationId,
      messageIds,
      status,
      deliveredAt: status === 'delivered' ? timestamp : undefined,
      readAt: status === 'read' ? timestamp : undefined,
    })
  }

  @SubscribeMessage('message:delivered')
  async handleDelivered(
    @MessageBody() data: { conversationId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.data.userId as string | undefined
    if (!userId) return

    const updatedIds = await this.messagingService.markAsDelivered(
      data.conversationId,
      userId,
      data.messageIds,
    )
    if (updatedIds.length > 0) {
      this.broadcastMessageStatus(data.conversationId, updatedIds, 'delivered')
    }
  }

  @SubscribeMessage('conversation:read')
  handleRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = client.data.userId as string | undefined
    if (!userId) return
    this.server
      .to(`user:${userId}`)
      .emit('conversation:read', { conversationId: data.conversationId, userId })
  }

  private resetTypingTimeout(conversationId: string, userId: string, name: string): void {
    const key = `${conversationId}:${userId}`
    this.clearTypingTimeout(conversationId, userId)
    this.typingTimeouts.set(
      key,
      setTimeout(() => {
        this.server.to(`conv:${conversationId}`).emit('typing', { userId, name, isTyping: false })
        this.typingTimeouts.delete(key)
      }, TYPING_TIMEOUT_MS),
    )
  }

  private clearTypingTimeout(conversationId: string, userId: string): void {
    const key = `${conversationId}:${userId}`
    const timeout = this.typingTimeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this.typingTimeouts.delete(key)
    }
  }

  private broadcastPresence(presence: UserPresence): void {
    this.server.to(`presence:${presence.userId}`).emit('presence:update', presence)
  }
}
