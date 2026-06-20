import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common'
import type { ChatRequestPreview } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ChatRequestsService } from './chat-requests.service'
import { CreateChatRequestDto } from './dto/create-chat-request.dto'
import { UpdateChatRequestDto } from './dto/update-chat-request.dto'
import type { User } from '@salonin/types'

@Controller('chat-requests')
@UseGuards(JwtAuthGuard)
export class ChatRequestsController {
  constructor(private readonly chatRequestsService: ChatRequestsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateChatRequestDto,
  ): Promise<ChatRequestPreview> {
    return this.chatRequestsService.create(user.id, dto.receiverId)
  }

  @Get('received')
  getReceived(@CurrentUser() user: User): Promise<ChatRequestPreview[]> {
    return this.chatRequestsService.getReceived(user.id)
  }

  @Get('conversation/:convId')
  getForConversation(
    @Param('convId', ParseUUIDPipe) convId: string,
    @CurrentUser() user: User,
  ): Promise<ChatRequestPreview | null> {
    return this.chatRequestsService.getForConversation(convId, user.id)
  }

  @Patch(':id')
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateChatRequestDto,
  ): Promise<ChatRequestPreview> {
    return this.chatRequestsService.respond(id, user.id, dto.action)
  }
}
