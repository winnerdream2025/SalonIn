import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

interface ExpoMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const device = await this.prisma.userDevice.findUnique({ where: { userId } })
      if (!device) return

      const message: ExpoMessage = { to: device.expoPushToken, title, body }
      if (data) message.data = data

      const response = await fetch('https://exp.host/--/push/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        this.logger.warn(`Expo push failed for userId=${userId}: HTTP ${response.status}`)
      }
    } catch (err) {
      this.logger.warn(`sendPush error for userId=${userId}: ${String(err)}`)
    }
  }

  async notifyNewMessage(recipientId: string, senderName: string, preview: string): Promise<void> {
    await this.sendPush(recipientId, `New message from ${senderName}`, preview, {
      type: 'message',
    })
  }

  async notifyNewJobPost(workerIds: string[], jobTitle: string, salonName: string): Promise<void> {
    await Promise.all(
      workerIds.map((id) =>
        this.sendPush(id, `New job: ${jobTitle}`, `Posted by ${salonName}`, { type: 'job_post' }),
      ),
    )
  }

  async upsertDevice(
    userId: string,
    expoPushToken: string,
    platform: 'IOS' | 'ANDROID',
  ): Promise<void> {
    await this.prisma.userDevice.upsert({
      where: { userId },
      update: { expoPushToken, platform },
      create: { userId, expoPushToken, platform },
    })
  }
}
