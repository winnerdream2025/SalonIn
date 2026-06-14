import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { NotificationType, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

interface ExpoMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

const PAGE_SIZE = 20

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    type?: NotificationType,
  ): Promise<void> {
    if (type) {
      await this.prisma.notification.create({
        data: { userId, type, title, body, data: (data ?? {}) as unknown as Prisma.InputJsonObject },
      }).catch(() => {})
    }

    try {
      const devices = await this.prisma.userDevice.findMany({ where: { userId } })
      if (!devices.length) return

      await Promise.all(
        devices.map(async (device) => {
          const message: ExpoMessage = { to: device.expoPushToken, title, body }
          if (data) message.data = data

          const response = await fetch('https://exp.host/--/push/v2/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(message),
          })

          if (!response.ok) {
            this.logger.warn(`Push failed userId=${userId} token=${device.expoPushToken}: HTTP ${response.status}`)
            return
          }

          const result = await response.json() as { data?: Array<{ status: string; details?: { error?: string } }> }
          if (result.data) {
            for (let i = 0; i < result.data.length; i++) {
              const ticket = result.data[i]
              if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                await this.prisma.userDevice.deleteMany({
                  where: { expoPushToken: device.expoPushToken },
                }).catch(() => {})
              }
            }
          }
        }),
      )
    } catch (err) {
      this.logger.warn(`sendPush error userId=${userId}: ${String(err)}`)
    }
  }

  async notifyNewMessage(recipientId: string, senderName: string, preview: string, conversationId?: string): Promise<void> {
    await this.sendPush(
      recipientId,
      senderName,
      preview,
      { conversationId, type: 'NEW_MESSAGE' },
      NotificationType.NEW_MESSAGE,
    )
  }

  async notifyNewApplication(salonUserId: string, workerName: string, jobId: string, jobTitle: string): Promise<void> {
    await this.sendPush(
      salonUserId,
      'New application',
      `${workerName} applied to ${jobTitle}`,
      { jobId, type: 'NEW_APPLICATION' },
      NotificationType.NEW_APPLICATION,
    )
  }

  async notifyApplicationAccepted(workerUserId: string, salonName: string, jobId: string, jobTitle: string): Promise<void> {
    await this.sendPush(
      workerUserId,
      'Application accepted 🎉',
      `${salonName} accepted your application for ${jobTitle}`,
      { jobId, type: 'APPLICATION_ACCEPTED' },
      NotificationType.APPLICATION_ACCEPTED,
    )
  }

  async notifyApplicationDeclined(workerUserId: string, salonName: string, jobId: string, jobTitle: string): Promise<void> {
    await this.sendPush(
      workerUserId,
      'Application update',
      `${salonName} has reviewed your application for ${jobTitle}`,
      { jobId, type: 'APPLICATION_DECLINED' },
      NotificationType.APPLICATION_DECLINED,
    )
  }

  async notifyChatRequest(receiverId: string, senderName: string, conversationId?: string): Promise<void> {
    await this.sendPush(
      receiverId,
      'New chat request',
      `${senderName} wants to connect`,
      { conversationId, type: 'CHAT_REQUEST' },
      NotificationType.CHAT_REQUEST,
    )
  }

  async notifyNewJobPost(workerIds: string[], jobTitle: string, salonName: string, jobId?: string): Promise<void> {
    await Promise.all(
      workerIds.map((id) =>
        this.sendPush(
          id,
          `New job: ${jobTitle}`,
          `Posted by ${salonName}`,
          { jobId, type: 'NEW_JOB_MATCH' },
          NotificationType.NEW_JOB_MATCH,
        ),
      ),
    )
  }

  async upsertDevice(userId: string, expoPushToken: string, platform: 'IOS' | 'ANDROID'): Promise<void> {
    await this.prisma.userDevice.upsert({
      where: { userId_expoPushToken: { userId, expoPushToken } },
      update: { platform },
      create: { userId, expoPushToken, platform },
    })
  }

  async list(userId: string, page = 1): Promise<{ data: object[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * PAGE_SIZE
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ])
    return { data, total, hasMore: skip + data.length < total }
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } })
  }

  async markRead(userId: string, id: string): Promise<void> {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } })
    if (!notif) throw new NotFoundException('Notification not found')
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async deleteNotification(userId: string, id: string): Promise<void> {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } })
    if (!notif) throw new NotFoundException('Notification not found')
    await this.prisma.notification.delete({ where: { id } })
  }
}
