import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { MessagingService } from '../messaging/messaging.service'
import type { CreateStoryDto } from './dto/create-story.dto'
import type { UpdateStoryDto } from './dto/update-story.dto'
import type { StoryReplyDto } from './dto/story-reply.dto'

const STORY_TTL_HOURS = 24
const logger = new Logger('StoriesService')

function storySelect(viewerId: string) {
  return {
    id: true,
    userId: true,
    mediaUrl: true,
    type: true,
    caption: true,
    textContent: true,
    textBgColor: true,
    visibility: true,
    bookingEnabled: true,
    location: true,
    mentions: true,
    createdAt: true,
    expiresAt: true,
    user: {
      select: {
        id: true,
        workerProfile: { select: { id: true, name: true, photoUrl: true } },
        salonProfile: { select: { id: true, name: true, photoUrls: true } },
      },
    },
    _count: { select: { views: true, likes: true, replies: true } },
    views: { where: { viewerId }, select: { viewedAt: true } },
    likes: { where: { userId: viewerId }, select: { id: true } },
  } as const
}

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async createStory(userId: string, dto: CreateStoryDto) {
    const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000)

    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl: dto.mediaUrl,
        type: dto.type,
        caption: dto.caption,
        textContent: dto.textContent,
        textBgColor: dto.textBgColor,
        visibility: dto.visibility ?? 'PUBLIC',
        bookingEnabled: dto.bookingEnabled ?? false,
        location: dto.location,
        mentions: dto.mentions ?? [],
        expiresAt,
      },
      select: storySelect(userId),
    })

    // Notify followers asynchronously
    void this.notifyFollowers(userId, story.id).catch((e) =>
      logger.warn(`notifyFollowers failed: ${String(e)}`),
    )

    // Notify mentioned users
    if (dto.mentions?.length) {
      void this.notifyMentions(userId, story.id, dto.mentions).catch(() => {})
    }

    return story
  }

  private async notifyFollowers(userId: string, storyId: string) {
    const poster = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
      },
    })
    const name = poster?.workerProfile?.name ?? poster?.salonProfile?.name ?? 'Someone'

    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    })

    await Promise.allSettled(
      followers.map((f) =>
        this.notifications.sendPush(
          f.followerId,
          'New Story',
          `${name} posted a new story`,
          { storyId, type: 'NEW_STORY' },
          'NEW_STORY' as never,
        ),
      ),
    )
  }

  private async notifyMentions(userId: string, storyId: string, mentionedIds: string[]) {
    const poster = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
      },
    })
    const name = poster?.workerProfile?.name ?? poster?.salonProfile?.name ?? 'Someone'

    await Promise.allSettled(
      mentionedIds
        .filter((id) => id !== userId)
        .map((id) =>
          this.notifications.sendPush(
            id,
            'You were mentioned',
            `${name} mentioned you in their story`,
            { storyId, type: 'STORY_MENTION' },
            'SYSTEM' as never,
          ),
        ),
    )
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async getMyStories(userId: string) {
    const now = new Date()
    return this.prisma.story.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: storySelect(userId),
    })
  }

  async getFeed(userId: string) {
    const now = new Date()

    const followRecords = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followedIds = new Set(followRecords.map((f) => f.followingId))

    // Build visibility filter: own stories + public stories + followed-only stories from followed users
    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        OR: [
          { userId },
          { visibility: 'PUBLIC' },
          { visibility: 'FOLLOWERS', userId: { in: [...followedIds] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: storySelect(userId),
    })

    type GroupEntry = {
      userId: string
      name: string
      photoUrl: string | null
      hasUnseen: boolean
      isFollowed: boolean
      stories: typeof stories
    }

    const map = new Map<string, GroupEntry>()
    for (const s of stories) {
      const name = s.user.workerProfile?.name ?? s.user.salonProfile?.name ?? 'Unknown'
      const photoUrl = s.user.workerProfile?.photoUrl ?? s.user.salonProfile?.photoUrls[0] ?? null
      const seen = s.views.length > 0

      if (!map.has(s.userId)) {
        map.set(s.userId, {
          userId: s.userId,
          name,
          photoUrl,
          hasUnseen: !seen,
          isFollowed: followedIds.has(s.userId),
          stories: [s],
        })
      } else {
        const entry = map.get(s.userId)!
        if (!seen) entry.hasUnseen = true
        entry.stories.push(s)
      }
    }

    const own = map.get(userId)
    const others = [...map.values()].filter((g) => g.userId !== userId)
    others.sort((a, b) => {
      const aScore = (a.isFollowed ? 2 : 0) + (a.hasUnseen ? 1 : 0)
      const bScore = (b.isFollowed ? 2 : 0) + (b.hasUnseen ? 1 : 0)
      return bScore - aScore
    })

    return { groups: own ? [own, ...others] : others }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async updateStory(userId: string, storyId: string, dto: UpdateStoryDto) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true, expiresAt: true },
    })
    if (!story) throw new NotFoundException('Story not found')
    if (story.userId !== userId) throw new ForbiddenException()
    if (story.expiresAt < new Date()) throw new ForbiddenException('Story has expired')

    return this.prisma.story.update({
      where: { id: storyId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.textContent !== undefined && { textContent: dto.textContent }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.bookingEnabled !== undefined && { bookingEnabled: dto.bookingEnabled }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.mentions !== undefined && { mentions: dto.mentions }),
      },
      select: { id: true, caption: true, visibility: true, bookingEnabled: true, location: true, updatedAt: true },
    })
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    })
    if (!story) throw new NotFoundException('Story not found')
    if (story.userId !== userId) throw new ForbiddenException()
    await this.prisma.story.delete({ where: { id: storyId } })
  }

  // ─── View ─────────────────────────────────────────────────────────────────

  async viewStory(viewerId: string, storyId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (!story) throw new NotFoundException('Story not found')
    await this.prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      create: { storyId, viewerId },
      update: { viewedAt: new Date() },
    })
  }

  // ─── Like ─────────────────────────────────────────────────────────────────

  async toggleLike(userId: string, storyId: string): Promise<{ liked: boolean }> {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: { userId: true },
    })
    if (!story) throw new NotFoundException('Story not found')

    const existing = await this.prisma.storyLike.findUnique({
      where: { storyId_userId: { storyId, userId } },
    })

    if (existing) {
      await this.prisma.storyLike.delete({ where: { storyId_userId: { storyId, userId } } })
      return { liked: false }
    }

    await this.prisma.storyLike.create({ data: { storyId, userId } })

    if (story.userId !== userId) {
      const liker = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          workerProfile: { select: { name: true } },
          salonProfile: { select: { name: true } },
        },
      })
      const name = liker?.workerProfile?.name ?? liker?.salonProfile?.name ?? 'Someone'
      void this.notifications
        .sendPush(
          story.userId,
          'Story liked ❤️',
          `${name} liked your story`,
          { storyId, type: 'STORY_LIKE' },
          'STORY_LIKE' as never,
        )
        .catch(() => {})
    }

    return { liked: true }
  }

  // ─── Reply ────────────────────────────────────────────────────────────────

  async replyToStory(userId: string, storyId: string, dto: StoryReplyDto) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: { userId: true, mediaUrl: true, type: true, caption: true },
    })
    if (!story) throw new NotFoundException('Story not found')

    // Save reply record
    const reply = await this.prisma.storyReply.create({
      data: { storyId, userId, content: dto.content },
    })

    // Route reply into chat as a message (creates conv if needed)
    if (story.userId !== userId) {
      void this.routeReplyToChat(userId, story.userId, storyId, dto.content, {
        mediaUrl: story.mediaUrl,
        type: story.type,
        caption: story.caption,
      }).catch(() => {})
    }

    // Notify story owner
    if (story.userId !== userId) {
      const replier = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          workerProfile: { select: { name: true } },
          salonProfile: { select: { name: true } },
        },
      })
      const name = replier?.workerProfile?.name ?? replier?.salonProfile?.name ?? 'Someone'
      void this.notifications
        .sendPush(
          story.userId,
          'Story reply',
          `${name}: ${dto.content.slice(0, 80)}`,
          { storyId, replyId: reply.id, type: 'STORY_REPLY' },
          'STORY_REPLY' as never,
        )
        .catch(() => {})
    }

    return reply
  }

  private async routeReplyToChat(
    senderId: string,
    recipientId: string,
    _storyId: string,
    content: string,
    storyMeta: { mediaUrl: string | null; type: string; caption: string | null },
  ) {
    // Find or create conversation
    let conv = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      select: { id: true },
    })

    if (!conv) {
      conv = await this.messaging.createConversation(senderId, recipientId)
    }

    await this.messaging.sendMessage(conv.id, senderId, {
      content,
      type: 'STORY_REPLY',
      mediaUrl: storyMeta.mediaUrl ?? undefined,
      mimeType: storyMeta.type,          // 'IMAGE' | 'VIDEO' | 'TEXT'
      locationName: storyMeta.caption ?? undefined, // reused field: story caption
    })
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    })
    if (!story) throw new NotFoundException('Story not found')
    if (story.userId !== userId) throw new ForbiddenException()

    return this.prisma.storyView.findMany({
      where: { storyId },
      orderBy: { viewedAt: 'desc' },
      select: {
        viewedAt: true,
        viewer: {
          select: {
            id: true,
            workerProfile: { select: { name: true, photoUrl: true } },
            salonProfile: { select: { name: true, photoUrls: true } },
          },
        },
      },
    })
  }

  async getAnalytics(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: {
        userId: true,
        _count: { select: { views: true, likes: true, replies: true } },
      },
    })
    if (!story) throw new NotFoundException('Story not found')
    if (story.userId !== userId) throw new ForbiddenException()

    const [viewers, likes, replies] = await Promise.all([
      this.prisma.storyView.findMany({
        where: { storyId },
        orderBy: { viewedAt: 'desc' },
        take: 100,
        select: {
          viewedAt: true,
          viewer: {
            select: {
              id: true,
              workerProfile: { select: { name: true, photoUrl: true } },
              salonProfile: { select: { name: true, photoUrls: true } },
            },
          },
        },
      }),
      this.prisma.storyLike.findMany({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          createdAt: true,
          user: {
            select: {
              id: true,
              workerProfile: { select: { name: true, photoUrl: true } },
              salonProfile: { select: { name: true, photoUrls: true } },
            },
          },
        },
      }),
      this.prisma.storyReply.findMany({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              workerProfile: { select: { name: true, photoUrl: true } },
              salonProfile: { select: { name: true, photoUrls: true } },
            },
          },
        },
      }),
    ])

    return {
      totalViews: story._count.views,
      totalLikes: story._count.likes,
      totalReplies: story._count.replies,
      viewers,
      likes,
      replies,
    }
  }

  // ─── Cron: cleanup expired stories ────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    const now = new Date()
    const { count } = await this.prisma.story.deleteMany({
      where: { expiresAt: { lt: now } },
    })
    if (count > 0) logger.log(`Cleaned up ${count} expired stories`)
  }
}
