import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { CreatePostDto } from './dto/create-post.dto'
import type { UpdatePostDto } from './dto/update-post.dto'
import type { CreateCommentDto } from './dto/create-comment.dto'
import type { CreateHighlightDto } from './dto/create-highlight.dto'
import type { UpdateHighlightDto } from './dto/update-highlight.dto'

const PAGE_SIZE = 20
const logger = new Logger('PostsService')

const HASHTAG_RE = /#([a-zA-Z0-9_]+)/g

function extractHashtags(caption: string | null | undefined): string[] {
  if (!caption) return []
  const matches = caption.matchAll(HASHTAG_RE)
  const tags = new Set<string>()
  for (const m of matches) tags.add(m[1].toLowerCase())
  return [...tags]
}

function authorSelect() {
  return {
    id: true,
    workerProfile: { select: { name: true, photoUrl: true } },
    salonProfile: { select: { name: true, photoUrls: true } },
    clientProfile: { select: { name: true, photoUrl: true } },
  } as const
}

function postSelect(viewerId: string) {
  return {
    id: true,
    userId: true,
    type: true,
    caption: true,
    mediaUrls: true,
    beforeUrl: true,
    afterUrl: true,
    serviceId: true,
    visibility: true,
    bookingEnabled: true,
    likesCount: true,
    commentsCount: true,
    createdAt: true,
    updatedAt: true,
    user: { select: authorSelect() },
    likes: viewerId
      ? { where: { userId: viewerId }, select: { id: true }, take: 1 }
      : false,
    hashtags: {
      select: { hashtag: { select: { id: true, tag: true } } },
    },
  } as const
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db(): any {
    return this.prisma as any
  }

  // ─── Create Post ──────────────────────────────────────────────────────────

  async createPost(userId: string, dto: CreatePostDto) {
    const tags = extractHashtags(dto.caption)

    const post = await this.prisma.post.create({
      data: {
        userId,
        type: dto.type as any,
        caption: dto.caption,
        mediaUrls: dto.mediaUrls ?? [],
        beforeUrl: dto.beforeUrl,
        afterUrl: dto.afterUrl,
        serviceId: dto.serviceId,
        visibility: (dto.visibility ?? 'PUBLIC') as any,
        bookingEnabled: dto.bookingEnabled ?? false,
      },
      select: postSelect(userId),
    })

    if (tags.length > 0) {
      void this.syncHashtags(post.id, tags).catch((e) =>
        logger.warn(`syncHashtags failed: ${String(e)}`),
      )
    }

    void this.notifyFollowers(userId, post.id).catch(() => {})

    return post
  }

  private async syncHashtags(postId: string, tags: string[]) {
    for (const tag of tags) {
      const hashtag = await this.db.hashtag.upsert({
        where: { tag },
        create: { tag, postCount: 1 },
        update: { postCount: { increment: 1 } },
      })
      await this.db.postHashtag.upsert({
        where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
        create: { postId, hashtagId: hashtag.id },
        update: {},
      })
    }
  }

  private async notifyFollowers(userId: string, postId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
        clientProfile: { select: { name: true } },
      },
    })
    const name =
      author?.workerProfile?.name ??
      author?.salonProfile?.name ??
      author?.clientProfile?.name ??
      'Someone'

    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
      take: 500,
    })

    await Promise.allSettled(
      followers.map((f) =>
        this.notifications.sendPush(
          f.followerId,
          'New post',
          `${name} shared a new post`,
          { postId, type: 'NEW_POST' },
          'NEW_POST' as never,
        ),
      ),
    )
  }

  // ─── Get Single Post ──────────────────────────────────────────────────────

  async getPost(postId: string, viewerId: string) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: postSelect(viewerId),
    })
    if (!post) throw new NotFoundException('Post not found')
    if (post.visibility === 'PRIVATE' && post.userId !== viewerId) {
      throw new ForbiddenException('This post is private')
    }
    return post
  }

  // ─── Get User Posts ───────────────────────────────────────────────────────

  async getUserPosts(targetUserId: string, viewerId: string, cursor?: string) {
    const isOwn = targetUserId === viewerId
    const isFollowing = isOwn
      ? false
      : !!(await this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
        }))

    const visibilityFilter = isOwn
      ? {}
      : isFollowing
        ? { visibility: { in: ['PUBLIC', 'FOLLOWERS'] as any[] } }
        : { visibility: 'PUBLIC' as any }

    const posts = await this.db.post.findMany({
      where: {
        userId: targetUserId,
        ...visibilityFilter,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: postSelect(viewerId),
    })

    const hasMore = posts.length > PAGE_SIZE
    const items = hasMore ? posts.slice(0, PAGE_SIZE) : posts
    return {
      data: items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null,
    }
  }

  // ─── Feed ─────────────────────────────────────────────────────────────────

  async getFeed(userId: string, cursor?: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followedIds = follows.map((f) => f.followingId)

    const posts = await this.db.post.findMany({
      where: {
        OR: [
          { userId },
          {
            userId: { in: followedIds },
            visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
          },
        ],
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: postSelect(userId),
    })

    const hasMore = posts.length > PAGE_SIZE
    const items = hasMore ? posts.slice(0, PAGE_SIZE) : posts
    return {
      posts: items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null,
    }
  }

  // ─── Explore / Trending ───────────────────────────────────────────────────

  async getExplore(viewerId: string, hashtag?: string, cursor?: string) {
    const where: any = {
      visibility: 'PUBLIC',
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    }

    if (hashtag) {
      const tag = hashtag.replace(/^#/, '').toLowerCase()
      const ht = await this.db.hashtag.findUnique({ where: { tag } })
      if (!ht) return { posts: [], nextCursor: null, trendingHashtags: [] }
      where.hashtags = { some: { hashtagId: ht.id } }
    }

    const [posts, trendingHashtags] = await Promise.all([
      this.db.post.findMany({
        where,
        orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
        take: PAGE_SIZE + 1,
        select: postSelect(viewerId),
      }),
      hashtag
        ? Promise.resolve([])
        : this.db.hashtag.findMany({
            orderBy: { postCount: 'desc' },
            take: 20,
            select: { tag: true, postCount: true },
          }),
    ])

    const hasMore = posts.length > PAGE_SIZE
    const items = hasMore ? posts.slice(0, PAGE_SIZE) : posts
    return {
      posts: items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null,
      trendingHashtags,
    }
  }

  // ─── Update Post ──────────────────────────────────────────────────────────

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    })
    if (!post) throw new NotFoundException('Post not found')
    if (post.userId !== userId) throw new ForbiddenException()

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility as any }),
        ...(dto.bookingEnabled !== undefined && { bookingEnabled: dto.bookingEnabled }),
      },
      select: postSelect(userId),
    })
  }

  // ─── Delete Post ──────────────────────────────────────────────────────────

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, hashtags: { select: { hashtagId: true } } },
    })
    if (!post) throw new NotFoundException('Post not found')
    if (post.userId !== userId) throw new ForbiddenException()

    const hashtagIds = post.hashtags.map((h: any) => h.hashtagId)
    await this.prisma.post.delete({ where: { id: postId } })

    if (hashtagIds.length > 0) {
      void this.db.hashtag
        .updateMany({
          where: { id: { in: hashtagIds } },
          data: { postCount: { decrement: 1 } },
        })
        .catch(() => {})
    }
  }

  // ─── Like / Unlike ────────────────────────────────────────────────────────

  async likePost(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, likesCount: true },
    })
    if (!post) throw new NotFoundException('Post not found')

    const existing = await this.db.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })
    if (existing) {
      return { liked: true, likesCount: post.likesCount }
    }

    const [, updated] = await this.prisma.$transaction([
      this.db.postLike.create({ data: { postId, userId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      }),
    ])

    if (post.userId !== userId) {
      void this.sendLikeNotification(userId, post.userId, postId).catch(() => {})
    }

    return { liked: true, likesCount: updated.likesCount }
  }

  async unlikePost(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { likesCount: true },
    })
    if (!post) throw new NotFoundException('Post not found')

    const existing = await this.db.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })
    if (!existing) {
      return { liked: false, likesCount: post.likesCount }
    }

    const [, updated] = await this.prisma.$transaction([
      this.db.postLike.delete({ where: { postId_userId: { postId, userId } } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
        select: { likesCount: true },
      }),
    ])

    return { liked: false, likesCount: updated.likesCount }
  }

  private async sendLikeNotification(likerId: string, ownerId: string, postId: string) {
    const liker = await this.prisma.user.findUnique({
      where: { id: likerId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
        clientProfile: { select: { name: true } },
      },
    })
    const name =
      liker?.workerProfile?.name ?? liker?.salonProfile?.name ?? liker?.clientProfile?.name ?? 'Someone'
    void this.notifications.sendPush(
      ownerId,
      'Post liked',
      `${name} liked your post`,
      { postId, type: 'POST_LIKE' },
      'POST_LIKE' as never,
    )
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async getComments(postId: string, cursor?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } })
    if (!post) throw new NotFoundException('Post not found')

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: authorSelect() },
        _count: { select: { replies: true } },
      },
    })

    const hasMore = comments.length > PAGE_SIZE
    const items = hasMore ? comments.slice(0, PAGE_SIZE) : comments
    return {
      data: items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null,
    }
  }

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    })
    if (!post) throw new NotFoundException('Post not found')

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true },
      })
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Parent comment not found on this post')
      }
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { postId, userId, content: dto.content, parentId: dto.parentId },
        select: {
          id: true,
          content: true,
          parentId: true,
          createdAt: true,
          user: { select: authorSelect() },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ])

    if (post.userId !== userId) {
      void this.sendCommentNotification(userId, post.userId, postId).catch(() => {})
    }

    return comment
  }

  async deleteComment(userId: string, postId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true },
    })
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found')
    if (comment.userId !== userId) throw new ForbiddenException()

    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ])
  }

  private async sendCommentNotification(commenterId: string, ownerId: string, postId: string) {
    const commenter = await this.prisma.user.findUnique({
      where: { id: commenterId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
        clientProfile: { select: { name: true } },
      },
    })
    const name =
      commenter?.workerProfile?.name ??
      commenter?.salonProfile?.name ??
      commenter?.clientProfile?.name ??
      'Someone'
    void this.notifications.sendPush(
      ownerId,
      'New comment',
      `${name} commented on your post`,
      { postId, type: 'POST_COMMENT' },
      'POST_COMMENT' as never,
    )
  }

  // ─── Story Highlights ─────────────────────────────────────────────────────

  async createHighlight(userId: string, dto: CreateHighlightDto) {
    return this.db.storyHighlight.create({
      data: {
        userId,
        title: dto.title,
        coverUrl: dto.coverUrl,
        storyIds: dto.storyIds ?? [],
      },
    })
  }

  async getUserHighlights(userId: string) {
    return this.db.storyHighlight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateHighlight(userId: string, highlightId: string, dto: UpdateHighlightDto) {
    const hl = await this.db.storyHighlight.findUnique({ where: { id: highlightId } })
    if (!hl) throw new NotFoundException('Highlight not found')
    if (hl.userId !== userId) throw new ForbiddenException()

    return this.db.storyHighlight.update({
      where: { id: highlightId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.storyIds !== undefined && { storyIds: dto.storyIds }),
        updatedAt: new Date(),
      },
    })
  }

  async deleteHighlight(userId: string, highlightId: string) {
    const hl = await this.db.storyHighlight.findUnique({ where: { id: highlightId } })
    if (!hl) throw new NotFoundException('Highlight not found')
    if (hl.userId !== userId) throw new ForbiddenException()
    await this.db.storyHighlight.delete({ where: { id: highlightId } })
  }
}
