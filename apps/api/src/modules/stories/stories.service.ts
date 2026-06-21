import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { CreateStoryDto } from './dto/create-story.dto'
import type { StoryReplyDto } from './dto/story-reply.dto'

const STORY_TTL_HOURS = 24

function storySelect(viewerId: string) {
  return {
    id: true,
    userId: true,
    mediaUrl: true,
    type: true,
    caption: true,
    createdAt: true,
    expiresAt: true,
    user: {
      select: {
        id: true,
        workerProfile: { select: { name: true, photoUrl: true } },
        salonProfile: { select: { name: true, photoUrls: true } },
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
  ) {}

  async createStory(userId: string, dto: CreateStoryDto) {
    const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000)
    return this.prisma.story.create({
      data: { userId, mediaUrl: dto.mediaUrl, type: dto.type, caption: dto.caption, expiresAt },
      select: storySelect(userId),
    })
  }

  async getMyStories(userId: string) {
    const now = new Date()
    return this.prisma.story.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: storySelect(userId),
    })
  }

  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { userId: true } })
    if (!story) throw new NotFoundException('Story not found')
    if (story.userId !== userId) throw new ForbiddenException()
    await this.prisma.story.delete({ where: { id: storyId } })
  }

  async getFeed(userId: string) {
    const now = new Date()
    const stories = await this.prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: storySelect(userId),
    })

    // Group by userId and annotate with hasUnseenStory
    const map = new Map<string, { userId: string; name: string; photoUrl: string | null; hasUnseen: boolean; stories: typeof stories }>()
    for (const s of stories) {
      const name = s.user.workerProfile?.name ?? s.user.salonProfile?.name ?? 'Unknown'
      const photoUrl = s.user.workerProfile?.photoUrl ?? s.user.salonProfile?.photoUrls[0] ?? null
      const seen = s.views.length > 0
      if (!map.has(s.userId)) {
        map.set(s.userId, { userId: s.userId, name, photoUrl, hasUnseen: !seen, stories: [s] })
      } else {
        const entry = map.get(s.userId)!
        if (!seen) entry.hasUnseen = true
        entry.stories.push(s)
      }
    }

    // Own stories first, then others sorted by unseen
    const own = map.get(userId)
    const others = [...map.values()].filter((g) => g.userId !== userId)
    others.sort((a, b) => (b.hasUnseen ? 1 : 0) - (a.hasUnseen ? 1 : 0))

    return { groups: own ? [own, ...others] : others }
  }

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
    } else {
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
        await this.notifications.sendPush(
          story.userId,
          'Story liked',
          `${name} liked your story`,
          { storyId, type: 'STORY_LIKE' },
          'STORY_LIKE' as never,
        )
      }
      return { liked: true }
    }
  }

  async replyToStory(userId: string, storyId: string, dto: StoryReplyDto) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: { userId: true },
    })
    if (!story) throw new NotFoundException('Story not found')

    const reply = await this.prisma.storyReply.create({
      data: { storyId, userId, content: dto.content },
    })

    if (story.userId !== userId) {
      const replier = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          workerProfile: { select: { name: true } },
          salonProfile: { select: { name: true } },
        },
      })
      const name = replier?.workerProfile?.name ?? replier?.salonProfile?.name ?? 'Someone'
      await this.notifications.sendPush(
        story.userId,
        'Story reply',
        `${name}: ${dto.content.slice(0, 80)}`,
        { storyId, replyId: reply.id, type: 'STORY_REPLY' },
        'STORY_REPLY' as never,
      )
    }

    return reply
  }

  async getViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { userId: true } })
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
}
