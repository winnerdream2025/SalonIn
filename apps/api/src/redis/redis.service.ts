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

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }
}
