import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.getForUser(userId, Number(page ?? 1), Number(limit ?? 20))
  }

  @Get('can-review/:subjectId')
  @UseGuards(JwtAuthGuard)
  canReview(
    @CurrentUser() user: User,
    @Param('subjectId') subjectId: string,
  ) {
    return this.reviews.canReview(user.id, subjectId)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReview(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reviews.deleteReview(id, user.id, user.role)
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard)
  replyToReview(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return this.reviews.replyToReview(id, user.id, text)
  }
}
