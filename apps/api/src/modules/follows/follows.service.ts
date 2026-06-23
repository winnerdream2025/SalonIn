import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationType } from '@prisma/client'

const PAGE_SIZE = 30

function userSelect() {
  return {
    id: true,
    followersCount: true,
    followingCount: true,
    workerProfile: { select: { name: true, photoUrl: true, specialties: true, city: true, state: true, isVerified: true, rating: true } },
    salonProfile: { select: { name: true, photoUrls: true, specialties: true, city: true, state: true, isVerified: true, rating: true } },
  } as const
}

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async followUser(followerId: string, followingId: string): Promise<{ following: boolean }> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself')
    }

    const target = await this.prisma.user.findUnique({ where: { id: followingId }, select: { id: true } })
    if (!target) throw new NotFoundException('User not found')

    try {
      await this.prisma.$transaction([
        this.prisma.follow.create({ data: { followerId, followingId } }),
        this.prisma.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } }),
        this.prisma.user.update({ where: { id: followingId }, data: { followersCount: { increment: 1 } } }),
      ])
    } catch {
      throw new ConflictException('Already following this user')
    }

    // Send notification async — don't await
    void this.sendFollowNotification(followerId, followingId)

    return { following: true }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ following: boolean }> {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    if (!existing) return { following: false }

    await this.prisma.$transaction([
      this.prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId } } }),
      this.prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
      this.prisma.user.update({ where: { id: followingId }, data: { followersCount: { decrement: 1 } } }),
    ])

    return { following: false }
  }

  async isFollowing(followerId: string, followingId: string): Promise<{ following: boolean }> {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    return { following: Boolean(existing) }
  }

  async getFollowers(userId: string, viewerId: string, cursor?: string, search?: string) {
    const follows = await this.prisma.follow.findMany({
      where: {
        followingId: userId,
        ...(cursor ? { id: { lt: cursor } } : {}),
        ...(search ? {
          follower: {
            OR: [
              { workerProfile: { name: { contains: search, mode: 'insensitive' } } },
              { salonProfile: { name: { contains: search, mode: 'insensitive' } } },
            ],
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        createdAt: true,
        follower: { select: userSelect() },
      },
    })

    const hasMore = follows.length > PAGE_SIZE
    const items = hasMore ? follows.slice(0, PAGE_SIZE) : follows

    // Check if viewer follows each of these users back
    const followerIds = items.map((f) => f.follower.id)
    const viewerFollows = viewerId
      ? await this.prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: followerIds } },
          select: { followingId: true },
        })
      : []
    const viewerFollowSet = new Set(viewerFollows.map((f) => f.followingId))

    return {
      data: items.map((f) => ({
        ...f.follower,
        followedAt: f.createdAt,
        isFollowedBack: viewerFollowSet.has(f.follower.id),
        isOwnFollow: f.follower.id === viewerId,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    }
  }

  async getFollowing(userId: string, viewerId: string, cursor?: string, search?: string) {
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(cursor ? { id: { lt: cursor } } : {}),
        ...(search ? {
          following: {
            OR: [
              { workerProfile: { name: { contains: search, mode: 'insensitive' } } },
              { salonProfile: { name: { contains: search, mode: 'insensitive' } } },
            ],
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        createdAt: true,
        following: { select: userSelect() },
      },
    })

    const hasMore = follows.length > PAGE_SIZE
    const items = hasMore ? follows.slice(0, PAGE_SIZE) : follows

    // Check if viewer follows each of these users
    const followingIds = items.map((f) => f.following.id)
    const viewerFollows = viewerId
      ? await this.prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: followingIds } },
          select: { followingId: true },
        })
      : []
    const viewerFollowSet = new Set(viewerFollows.map((f) => f.followingId))

    return {
      data: items.map((f) => ({
        ...f.following,
        followedAt: f.createdAt,
        isFollowing: viewerFollowSet.has(f.following.id) || f.following.id === userId,
        isOwnProfile: f.following.id === viewerId,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    }
  }

  async removeFollower(userId: string, followerId: string): Promise<void> {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: userId } },
    })
    if (!existing) return

    await this.prisma.$transaction([
      this.prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId: userId } } }),
      this.prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
      this.prisma.user.update({ where: { id: userId }, data: { followersCount: { decrement: 1 } } }),
    ])
  }

  async getSuggestedUsers(userId: string) {
    // Get who the user already follows
    const alreadyFollowing = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followingIds = new Set(alreadyFollowing.map((f) => f.followingId))
    followingIds.add(userId)

    // Get mutual follow candidates: people followed by people I follow
    const mutualCandidates = await this.prisma.follow.findMany({
      where: { followerId: { in: [...followingIds].filter((id) => id !== userId) } },
      select: { followingId: true },
      distinct: ['followingId'],
      take: 20,
    })
    const mutualIds = mutualCandidates
      .map((f) => f.followingId)
      .filter((id) => !followingIds.has(id))

    // Top rated workers/salons not yet followed (include user stats)
    const topWorkers = await this.prisma.workerProfile.findMany({
      where: { userId: { notIn: [...followingIds] } },
      orderBy: { rating: 'desc' },
      take: 10,
      select: {
        userId: true, name: true, photoUrl: true, specialties: true,
        city: true, state: true, isVerified: true, rating: true,
        _count: { select: { portfolioItems: true } },
        user: { select: { followersCount: true } },
      },
    })
    const topSalons = await this.prisma.salonProfile.findMany({
      where: { userId: { notIn: [...followingIds] } },
      orderBy: { rating: 'desc' },
      take: 5,
      select: {
        userId: true, name: true, photoUrls: true, specialties: true,
        city: true, state: true, isVerified: true, rating: true,
        _count: { select: { jobPosts: true } },
        user: { select: { followersCount: true } },
      },
    })

    const suggestions: Array<{
      id: string
      name: string
      photoUrl: string | null
      specialties: string[]
      city: string | null
      state: string | null
      isVerified: boolean
      rating: number
      type: 'worker' | 'salon'
      reason: 'mutual' | 'top_rated'
      followersCount: number
      listingsCount: number
    }> = []

    // Mutual follows first
    for (const uid of mutualIds.slice(0, 5)) {
      const user = await this.prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          followersCount: true,
          workerProfile: {
            select: {
              name: true, photoUrl: true, specialties: true,
              city: true, state: true, isVerified: true, rating: true,
              _count: { select: { portfolioItems: true } },
            },
          },
          salonProfile: {
            select: {
              name: true, photoUrls: true, specialties: true,
              city: true, state: true, isVerified: true, rating: true,
              _count: { select: { jobPosts: true } },
            },
          },
        },
      })
      if (!user) continue
      if (user.workerProfile) {
        suggestions.push({ id: uid, name: user.workerProfile.name, photoUrl: user.workerProfile.photoUrl, specialties: user.workerProfile.specialties, city: user.workerProfile.city, state: user.workerProfile.state, isVerified: user.workerProfile.isVerified, rating: user.workerProfile.rating, type: 'worker', reason: 'mutual', followersCount: user.followersCount, listingsCount: user.workerProfile._count.portfolioItems })
      } else if (user.salonProfile) {
        suggestions.push({ id: uid, name: user.salonProfile.name, photoUrl: user.salonProfile.photoUrls[0] ?? null, specialties: user.salonProfile.specialties, city: user.salonProfile.city, state: user.salonProfile.state, isVerified: user.salonProfile.isVerified, rating: user.salonProfile.rating, type: 'salon', reason: 'mutual', followersCount: user.followersCount, listingsCount: user.salonProfile._count.jobPosts })
      }
    }

    for (const w of topWorkers) {
      suggestions.push({ id: w.userId, name: w.name, photoUrl: w.photoUrl, specialties: w.specialties, city: w.city, state: w.state, isVerified: w.isVerified, rating: w.rating, type: 'worker', reason: 'top_rated', followersCount: w.user.followersCount, listingsCount: w._count.portfolioItems })
    }
    for (const s of topSalons) {
      suggestions.push({ id: s.userId, name: s.name, photoUrl: s.photoUrls[0] ?? null, specialties: s.specialties, city: s.city, state: s.state, isVerified: s.isVerified, rating: s.rating, type: 'salon', reason: 'top_rated', followersCount: s.user.followersCount, listingsCount: s._count.jobPosts })
    }

    // Deduplicate
    const seen = new Set<string>()
    return suggestions.filter((s) => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    }).slice(0, 20)
  }

  private async sendFollowNotification(followerId: string, followingId: string) {
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: {
        workerProfile: { select: { name: true } },
        salonProfile: { select: { name: true } },
      },
    })
    const name = follower?.workerProfile?.name ?? follower?.salonProfile?.name ?? 'Someone'
    const followerRole = follower?.salonProfile ? 'SALON' : 'WORKER'
    await this.notifications.sendPush(
      followingId,
      'New follower',
      `${name} started following you`,
      { followerId, followerRole, type: 'NEW_FOLLOWER' },
      NotificationType.NEW_FOLLOWER,
    )
  }

  async getFollowedUserIds(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    return follows.map((f) => f.followingId)
  }
}
