import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import Redis from 'ioredis'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { WorkersModule } from './modules/workers/workers.module'
import { SalonsModule } from './modules/salons/salons.module'
import { MediaModule } from './modules/media/media.module'
import { JobsModule } from './modules/jobs/jobs.module'
import { MessagingModule } from './modules/messaging/messaging.module'
import { VerifyModule } from './modules/verify/verify.module'
import { ReportsModule } from './modules/reports/reports.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { MetricsModule } from './common/metrics/metrics.module'
import { HealthModule } from './health/health.module'
import { ChatRequestsModule } from './modules/chat-requests/chat-requests.module'
import { SpecialtiesModule } from './modules/specialties/specialties.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { PlacesModule } from './modules/places/places.module'
import { StoriesModule } from './modules/stories/stories.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.getOrThrow<string>('REDIS_URL'))
        const redis = new Redis({
          host: redisUrl.hostname,
          port: Number(redisUrl.port),
          username: redisUrl.username || undefined,
          password: redisUrl.password || undefined,
          tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
        })
        return {
          throttlers: [{ name: 'short', ttl: 60000, limit: 10 }],
          storage: new ThrottlerStorageRedisService(redis),
        }
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>('REDIS_URL'))
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port),
            username: url.username || undefined,
            password: url.password || undefined,
          },
        }
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    WorkersModule,
    SalonsModule,
    MediaModule,
    JobsModule,
    NotificationsModule,
    MessagingModule,
    VerifyModule,
    ReportsModule,
    MetricsModule,
    HealthModule,
    ChatRequestsModule,
    SpecialtiesModule,
    ReviewsModule,
    PlacesModule,
    StoriesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
