import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.get('__health__'),
    ])

    const db = checks[0].status === 'fulfilled'
    const cache = checks[1].status === 'fulfilled'

    const status = db && cache ? 'ok' : 'degraded'

    if (!db) {
      throw new ServiceUnavailableException({ status: 'error', db: false, cache })
    }

    return { status, db, cache, timestamp: new Date().toISOString() }
  }
}
