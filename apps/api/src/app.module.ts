import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000,
      limit: 10,
    }]),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
