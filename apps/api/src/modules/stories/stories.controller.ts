import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
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
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateStoryDto) {
    return this.stories.createStory(userId, dto)
  }

  @Get('feed')
  feed(@CurrentUser('sub') userId: string) {
    return this.stories.getFeed(userId)
  }

  @Get('my')
  mine(@CurrentUser('sub') userId: string) {
    return this.stories.getMyStories(userId)
  }

  @Delete(':id')
  delete(@CurrentUser('sub') userId: string, @Param('id') storyId: string) {
    return this.stories.deleteStory(userId, storyId)
  }

  @Post(':id/view')
  view(@CurrentUser('sub') userId: string, @Param('id') storyId: string) {
    return this.stories.viewStory(userId, storyId)
  }

  @Post(':id/like')
  like(@CurrentUser('sub') userId: string, @Param('id') storyId: string) {
    return this.stories.toggleLike(userId, storyId)
  }

  @Post(':id/reply')
  reply(
    @CurrentUser('sub') userId: string,
    @Param('id') storyId: string,
    @Body() dto: StoryReplyDto,
  ) {
    return this.stories.replyToStory(userId, storyId, dto)
  }

  @Get(':id/viewers')
  viewers(@CurrentUser('sub') userId: string, @Param('id') storyId: string) {
    return this.stories.getViewers(userId, storyId)
  }
}
