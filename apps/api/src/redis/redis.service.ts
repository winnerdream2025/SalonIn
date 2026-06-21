import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'))
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, mode: 'EX', ttl: number): Promise<void> {
    await this.client.set(key, value, mode, ttl)
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys: string[] = []
    let cursor = '0'
    do {
      const [next, found] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = next
      keys.push(...found)
    } while (cursor !== '0')
    if (keys.length > 0) await this.client.del(...keys)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members)
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key)
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds)
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }
}
