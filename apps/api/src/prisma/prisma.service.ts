import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: { url: PrismaService.buildUrl() },
      },
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  private static buildUrl(): string {
    const base = process.env.DATABASE_URL ?? ''
    try {
      const url = new URL(base)
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '25')
      if (!url.searchParams.has('pool_timeout'))     url.searchParams.set('pool_timeout', '30')
      return url.toString()
    } catch {
      return base
    }
  }
}
