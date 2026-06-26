import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { NotificationType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name)

  constructor(
    private readonly db: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendReminders(): Promise<void> {
    const now = new Date()

    const windows = [
      { label: '24h', minutesBefore: 1440, toleranceMs: 2 * 60 * 1000 },
      { label: '2h',  minutesBefore: 120,  toleranceMs: 2 * 60 * 1000 },
      { label: '30m', minutesBefore: 30,   toleranceMs: 2 * 60 * 1000 },
    ]

    for (const window of windows) {
      const target = new Date(now.getTime() + window.minutesBefore * 60 * 1000)
      const from = new Date(target.getTime() - window.toleranceMs)
      const to   = new Date(target.getTime() + window.toleranceMs)

      const targetDate = target.toISOString().slice(0, 10)

      const bookings = await this.db.booking.findMany({
        where: {
          status: 'CONFIRMED',
          date: targetDate,
          clientUserId: { not: null },
        },
        include: {
          service: { select: { name: true } },
        },
      })

      // Filter by start time falling in window
      type BookingRow = typeof bookings[number]
      const inWindow = bookings.filter((b: BookingRow) => {
        const [hStr = '0', mStr = '0'] = (b.startTime as string).split(':')
        const apptMs = new Date(
          `${b.date as string}T${String(parseInt(hStr, 10)).padStart(2, '0')}:${String(parseInt(mStr, 10)).padStart(2, '0')}:00Z`,
        ).getTime()
        return apptMs >= from.getTime() && apptMs < to.getTime()
      })

      for (const booking of inWindow) {
        try {
          const label =
            window.label === '24h' ? 'tomorrow'
            : window.label === '2h' ? 'in 2 hours'
            : 'in 30 minutes'

          const serviceName = (booking.service as { name: string } | null)?.name ?? 'your appointment'

          await this.notifications.sendPush(
            booking.clientUserId as string,
            `Reminder: ${serviceName}`,
            `Your appointment is ${label}.`,
            { bookingId: booking.id, event: 'booking.reminder', window: window.label },
            'BOOKING_REMINDER' as unknown as NotificationType,
          )

          this.logger.log(`Sent ${window.label} reminder for booking ${booking.id}`)
        } catch (err) {
          this.logger.warn(`Failed reminder for booking ${booking.id}: ${String(err)}`)
        }
      }
    }
  }
}
