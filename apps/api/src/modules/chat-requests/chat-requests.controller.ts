import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ChatRequestsService } from './chat-requests.service'
import { CreateChatRequestDto } from './dto/create-chat-request.dto'
import { UpdateChatRequestDto } from './dto/update-chat-request.dto'
import type { ChatRequestPreview, User } from '@salonin/types'

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

  @Patch(':id')
  respond(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateChatRequestDto,
  ): Promise<ChatRequestPreview> {
    return this.chatRequestsService.respond(id, user.id, dto.action)
  }
}
