import { Injectable } from '@nestjs/common'
import StatsD from 'hot-shots'

@Injectable()
export class MetricsService {
  private readonly client: InstanceType<typeof StatsD>

  constructor() {
    this.client = new StatsD({
      host: process.env.DD_AGENT_HOST ?? 'localhost',
      port: 8125,
      prefix: 'salonin.',
      globalTags: [
        `env:${process.env.DD_ENV ?? 'development'}`,
        `service:${process.env.DD_SERVICE ?? 'salonin-api'}`,
      ],
      errorHandler: () => undefined,
    })
  }

  timing(metric: string, ms: number, tags?: string[]): void {
    this.client.timing(metric, ms, tags)
  }

  increment(metric: string, tags?: string[]): void {
    this.client.increment(metric, tags)
  }

  gauge(metric: string, value: number, tags?: string[]): void {
    this.client.gauge(metric, value, tags)
  }
}
