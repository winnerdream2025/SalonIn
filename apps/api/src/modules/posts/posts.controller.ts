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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { CreateCommentDto } from './dto/create-comment.dto'
import { CreateHighlightDto } from './dto/create-highlight.dto'
import { UpdateHighlightDto } from './dto/update-highlight.dto'

@Controller('posts')
export class PostsController {
  constructor(private readonly svc: PostsService) {}

  // ─── Feed ─────────────────────────────────────────────────────────────────

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed(@CurrentUser() user: User, @Query('cursor') cursor?: string) {
    return { data: await this.svc.getFeed(user.id, cursor) }
  }

  // ─── Explore ──────────────────────────────────────────────────────────────

  @Get('explore')
  @UseGuards(OptionalJwtAuthGuard)
  async getExplore(
    @CurrentUser() user: User | null,
    @Query('hashtag') hashtag?: string,
    @Query('cursor') cursor?: string,
  ) {
    return { data: await this.svc.getExplore(user?.id ?? '', hashtag, cursor) }
  }

  // ─── User Posts ───────────────────────────────────────────────────────────

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserPosts(
    @CurrentUser() user: User | null,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('cursor') cursor?: string,
  ) {
    return { data: await this.svc.getUserPosts(targetUserId, user?.id ?? '', cursor) }
  }

  // ─── Create Post ──────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPost(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return { data: await this.svc.createPost(user.id, dto) }
  }

  // ─── Single Post ──────────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getPost(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) postId: string,
  ) {
    return { data: await this.svc.getPost(postId, user?.id ?? '') }
  }

  // ─── Update Post ──────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return { data: await this.svc.updatePost(user.id, postId, dto) }
  }

  // ─── Delete Post ──────────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) postId: string) {
    await this.svc.deletePost(user.id, postId)
  }

  // ─── Like ─────────────────────────────────────────────────────────────────

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async likePost(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) postId: string) {
    return { data: await this.svc.likePost(user.id, postId) }
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlikePost(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) postId: string) {
    return { data: await this.svc.unlikePost(user.id, postId) }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  async getComments(
    @Param('id', ParseUUIDPipe) postId: string,
    @Query('cursor') cursor?: string,
  ) {
    return { data: await this.svc.getComments(postId, cursor) }
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return { data: await this.svc.addComment(user.id, postId, dto) }
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    await this.svc.deleteComment(user.id, postId, commentId)
  }

  // ─── Story Highlights ─────────────────────────────────────────────────────

  @Post('highlights')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createHighlight(@CurrentUser() user: User, @Body() dto: CreateHighlightDto) {
    return { data: await this.svc.createHighlight(user.id, dto) }
  }

  @Get('highlights/user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserHighlights(@Param('userId', ParseUUIDPipe) userId: string) {
    return { data: await this.svc.getUserHighlights(userId) }
  }

  @Patch('highlights/:highlightId')
  @UseGuards(JwtAuthGuard)
  async updateHighlight(
    @CurrentUser() user: User,
    @Param('highlightId', ParseUUIDPipe) highlightId: string,
    @Body() dto: UpdateHighlightDto,
  ) {
    return { data: await this.svc.updateHighlight(user.id, highlightId, dto) }
  }

  @Delete('highlights/:highlightId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHighlight(
    @CurrentUser() user: User,
    @Param('highlightId', ParseUUIDPipe) highlightId: string,
  ) {
    await this.svc.deleteHighlight(user.id, highlightId)
  }
}
