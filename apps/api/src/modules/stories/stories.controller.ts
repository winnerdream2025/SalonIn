import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { StoriesService } from './stories.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { StoryReplyDto } from './dto/story-reply.dto'

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateStoryDto) {
    return this.stories.createStory(user.id, dto)
  }

  @Get('feed')
  feed(@CurrentUser() user: User) {
    return this.stories.getFeed(user.id)
  }

  @Get('my')
  mine(@CurrentUser() user: User) {
    return this.stories.getMyStories(user.id)
  }

  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') storyId: string) {
    return this.stories.deleteStory(user.id, storyId)
  }

  @Post(':id/view')
  view(@CurrentUser() user: User, @Param('id') storyId: string) {
    return this.stories.viewStory(user.id, storyId)
  }

  @Post(':id/like')
  like(@CurrentUser() user: User, @Param('id') storyId: string) {
    return this.stories.toggleLike(user.id, storyId)
  }

  @Post(':id/reply')
  reply(
    @CurrentUser() user: User,
    @Param('id') storyId: string,
    @Body() dto: StoryReplyDto,
  ) {
    return this.stories.replyToStory(user.id, storyId, dto)
  }

  @Get(':id/viewers')
  viewers(@CurrentUser() user: User, @Param('id') storyId: string) {
    return this.stories.getViewers(user.id, storyId)
  }
}
