import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { MessagingService } from './messaging.service'
import { MessagingGateway } from './messaging.gateway'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { GetMessagesDto } from './dto/get-messages.dto'

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  @Post()
  async createConversation(
    @CurrentUser() user: User,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(user.id, dto.otherUserId)
  }

  @Get()
  async getConversations(@CurrentUser() user: User) {
    return this.messagingService.getConversations(user.id)
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService.getMessages(id, user.id, query.cursor)
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.messagingService.sendMessage(id, user.id, dto.content, dto.mediaUrl)
    this.messagingGateway.broadcastMessage(id, message)
    return message
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    await this.messagingService.markAsRead(id, user.id)
    return { success: true }
  }
}
