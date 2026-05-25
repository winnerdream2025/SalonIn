import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway {
  @WebSocketServer()
  server!: Server

  @SubscribeMessage('join:conversation')
  handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
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
}
