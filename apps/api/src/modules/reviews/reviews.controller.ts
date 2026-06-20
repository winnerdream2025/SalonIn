import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ReviewsService } from './reviews.service'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReplyReviewDto } from './dto/reply-review.dto'

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto)
  }

  @Get('user/:userId')
  getForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20))
    return this.reviews.getForUser(userId, p, l)
  }

  @Get('can-review/:subjectId')
  @UseGuards(JwtAuthGuard)
  canReview(
    @CurrentUser() user: User,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.reviews.canReview(user.id, subjectId)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReview(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.deleteReview(id, user.id, user.role)
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard)
  replyToReview(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviews.replyToReview(id, user.id, dto.text)
  }
}
