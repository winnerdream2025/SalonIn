import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Server, Socket } from 'socket.io'
import { PrismaService } from '../../prisma/prisma.service'

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined
    if (userId) {
      void client.join(`user:${userId}`)
    }
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
  handleTypingStart(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    client
      .to(`conv:${data.conversationId}`)
      .emit('typing', { userId: data.userId, isTyping: true })
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    client
      .to(`conv:${data.conversationId}`)
      .emit('typing', { userId: data.userId, isTyping: false })
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
}
