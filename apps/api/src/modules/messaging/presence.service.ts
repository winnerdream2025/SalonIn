import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import type { UserPresence } from '@salonin/types'

const PRESENCE_KEY = (userId: string) => `presence:${userId}`
const PRESENCE_SOCKETS_KEY = (userId: string) => `presence:${userId}:sockets`
const PRESENCE_TTL_SECONDS = 60
const SOCKETS_KEY_TTL_SECONDS = 86400

@Injectable()
export class PresenceService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Redis is the source of truth; reset any stale DB-online rows after a crash/restart
    await this.prisma.user.updateMany({
      where: { isOnline: true },
      data: { isOnline: false, lastSeenAt: new Date() },
    })
  }

  async markOnline(userId: string, socketId: string): Promise<UserPresence | null> {
    const added = await this.redis.sadd(PRESENCE_SOCKETS_KEY(userId), socketId)
    await this.redis.expire(PRESENCE_SOCKETS_KEY(userId), SOCKETS_KEY_TTL_SECONDS)

    await this.redis.set(PRESENCE_KEY(userId), '1', 'EX', PRESENCE_TTL_SECONDS)

    if (added === 0) {
      // Already had an active socket; nothing changed at the user level
      return null
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    return {
      userId,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
    }
  }

  async markOffline(userId: string, socketId: string): Promise<UserPresence | null> {
    await this.redis.srem(PRESENCE_SOCKETS_KEY(userId), socketId)
    const remaining = await this.redis.scard(PRESENCE_SOCKETS_KEY(userId))

    if (remaining > 0) {
      // Still has other active sockets
      return null
    }

    await this.redis.del(PRESENCE_KEY(userId))

    const lastSeenAt = new Date()
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt },
    })

    return {
      userId,
      isOnline: false,
      lastSeenAt: lastSeenAt.toISOString(),
    }
  }

  async heartbeat(userId: string): Promise<void> {
    await this.redis.set(PRESENCE_KEY(userId), '1', 'EX', PRESENCE_TTL_SECONDS)
  }

  async getPresence(userId: string): Promise<UserPresence> {
    const cached = await this.redis.get(PRESENCE_KEY(userId))
    if (cached === '1') {
      return {
        userId,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isOnline: true, lastSeenAt: true },
    })

    return {
      userId,
      isOnline: user?.isOnline ?? false,
      lastSeenAt: user?.lastSeenAt?.toISOString() ?? null,
    }
  }

  async getPresenceBulk(userIds: string[]): Promise<Record<string, UserPresence>> {
    const result: Record<string, UserPresence> = {}
    const missing: string[] = []

    await Promise.all(
      userIds.map(async (id) => {
        const cached = await this.redis.get(PRESENCE_KEY(id))
        if (cached === '1') {
          result[id] = {
            userId: id,
            isOnline: true,
            lastSeenAt: new Date().toISOString(),
          }
        } else {
          missing.push(id)
        }
      }),
    )

    if (missing.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: missing } },
        select: { id: true, isOnline: true, lastSeenAt: true },
      })

      for (const user of users) {
        result[user.id] = {
          userId: user.id,
          isOnline: user.isOnline,
          lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        }
      }
    }

    return result
  }
}
