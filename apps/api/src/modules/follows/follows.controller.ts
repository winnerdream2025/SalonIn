import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { FollowsService } from './follows.service'

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post(':userId')
  follow(@CurrentUser() user: User, @Param('userId') targetId: string) {
    return this.follows.followUser(user.id, targetId)
  }

  @Delete(':userId')
  unfollow(@CurrentUser() user: User, @Param('userId') targetId: string) {
    return this.follows.unfollowUser(user.id, targetId)
  }

  @Get(':userId/status')
  status(@CurrentUser() user: User, @Param('userId') targetId: string) {
    return this.follows.isFollowing(user.id, targetId)
  }

  @Get(':userId/followers')
  followers(
    @CurrentUser() user: User,
    @Param('userId') targetId: string,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
  ) {
    return this.follows.getFollowers(targetId, user.id, cursor, search)
  }

  @Get(':userId/following')
  following(
    @CurrentUser() user: User,
    @Param('userId') targetId: string,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
  ) {
    return this.follows.getFollowing(targetId, user.id, cursor, search)
  }

  @Delete(':userId/remove-follower')
  removeFollower(@CurrentUser() user: User, @Param('userId') followerId: string) {
    return this.follows.removeFollower(user.id, followerId)
  }

  @Get('suggestions/me')
  suggestions(@CurrentUser() user: User) {
    return this.follows.getSuggestedUsers(user.id)
  }
}
