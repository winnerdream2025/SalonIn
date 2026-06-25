import { Injectable, Logger } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'
import type { NotificationType } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { BookingProfilesService } from '../../booking-profiles/booking-profiles.service'

// Cast helper — BOOKING_* variants are in the schema but may not yet be generated
function bookingNotifType(s: string): NotificationType {
  return s as NotificationType
}

// ─── Webhook payload shapes (subset — extend as Havana docs evolve) ──────────

interface HavanaBookingPayload {
  tenantSlug: string
  bookingId: string
  clientEmail: string
  clientName?: string
  clientPhone?: string
  serviceName?: string
  date?: string        // YYYY-MM-DD
  startTime?: string   // h:mm AM/PM
  confirmationCode?: string
  totalPrice?: number
  price?: number
  currency?: string
  reason?: string      // cancelled only
  newDate?: string     // rescheduled only
  newStartTime?: string // rescheduled only
}

interface HavanaPaymentPayload {
  tenantSlug: string
  bookingId: string
  clientEmail: string
  amount?: number
  currency?: string
  transactionId?: string
}

type HavanaEvent =
  | { event: 'booking.created';      payload: HavanaBookingPayload }
  | { event: 'booking.confirmed';    payload: HavanaBookingPayload }
  | { event: 'booking.cancelled';    payload: HavanaBookingPayload }
  | { event: 'booking.rescheduled';  payload: HavanaBookingPayload }
  | { event: 'payment.completed';    payload: HavanaPaymentPayload }

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class HavanabookWebhookService {
  private readonly logger = new Logger(HavanabookWebhookService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly bookingProfiles: BookingProfilesService,
  ) {}

  // ── Signature validation ─────────────────────────────────────────────────

  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = process.env.HAVANA_WEBHOOK_SECRET
    if (!secret) {
      this.logger.warn('HAVANA_WEBHOOK_SECRET is not set — skipping signature check')
      return true // allow in dev; prod should always have the secret
    }
    if (!signature) return false

    const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  // ── Main dispatch ─────────────────────────────────────────────────────────

  async handleEvent(parsed: unknown): Promise<void> {
    const webhookEvent = parsed as HavanaEvent
    const { event, payload: data } = webhookEvent

    this.logger.log(`Havana webhook: ${event} for tenant=${data.tenantSlug}`)

    // Resolve the SalonIn provider from the tenantSlug
    const profile = await this.bookingProfiles.getByTenantSlug(data.tenantSlug)
    if (!profile) {
      this.logger.warn(`No ProviderBookingProfile for tenantSlug=${data.tenantSlug}`)
      return
    }

    // Resolve client SalonIn user (if they have an account)
    const clientUser = data && 'clientEmail' in data
      ? await this.prisma.user.findUnique({
          where: { email: (data as HavanaBookingPayload).clientEmail },
          select: { id: true },
        })
      : null

    // Resolve provider's user ID
    const providerUser = await this.resolveProviderUser(profile.providerId, profile.providerType)

    switch (event) {
      case 'booking.created':
        await this.onBookingCreated(data, clientUser?.id, providerUser)
        break
      case 'booking.confirmed':
        await this.onBookingConfirmed(data, clientUser?.id, providerUser)
        break
      case 'booking.cancelled':
        await this.onBookingCancelled(data, clientUser?.id, providerUser)
        break
      case 'booking.rescheduled':
        await this.onBookingRescheduled(data, clientUser?.id, providerUser)
        break
      case 'payment.completed':
        await this.onPaymentCompleted(data, clientUser?.id, providerUser)
        break
      default:
        this.logger.warn(`Unknown Havana event: ${String((webhookEvent as unknown as { event: string }).event)}`)
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  private async onBookingCreated(
    data: HavanaBookingPayload,
    clientUserId: string | undefined,
    providerUserId: string | null,
  ): Promise<void> {
    const summary = this.buildBookingSummary(data)

    // Notify provider: new booking received
    if (providerUserId) {
      const clientLabel = data.clientName ?? data.clientEmail
      await this.notifications.sendPush(
        providerUserId,
        'New Booking',
        `${clientLabel} booked ${data.serviceName ?? 'a service'}${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.created' },
        bookingNotifType('BOOKING_CREATED'),
      )
    }

    // Inject system message into the conversation (if both users are on SalonIn)
    if (clientUserId && providerUserId) {
      await this.injectSystemMessage(
        clientUserId,
        providerUserId,
        'BOOKING_REQUEST',
        `Booking requested: ${data.serviceName ?? 'a service'}${summary ? ` · ${summary}` : ''}`,
      )
    }
  }

  private async onBookingConfirmed(
    data: HavanaBookingPayload,
    clientUserId: string | undefined,
    providerUserId: string | null,
  ): Promise<void> {
    const summary = this.buildBookingSummary(data)

    if (clientUserId) {
      await this.notifications.sendPush(
        clientUserId,
        'Booking Confirmed',
        `Your ${data.serviceName ?? 'appointment'} is confirmed${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.confirmed' },
        bookingNotifType('BOOKING_CONFIRMED'),
      )
    }

    if (clientUserId && providerUserId) {
      await this.injectSystemMessage(
        clientUserId,
        providerUserId,
        'BOOKING_CONFIRMED',
        `Booking confirmed: ${data.serviceName ?? 'a service'}${summary ? ` · ${summary}` : ''}${data.confirmationCode ? ` · Ref: ${data.confirmationCode}` : ''}`,
      )
    }
  }

  private async onBookingCancelled(
    data: HavanaBookingPayload,
    clientUserId: string | undefined,
    providerUserId: string | null,
  ): Promise<void> {
    const summary = this.buildBookingSummary(data)

    if (clientUserId) {
      await this.notifications.sendPush(
        clientUserId,
        'Booking Cancelled',
        `Your ${data.serviceName ?? 'appointment'} has been cancelled${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.cancelled' },
        bookingNotifType('BOOKING_CANCELLED'),
      )
    }
    if (providerUserId) {
      await this.notifications.sendPush(
        providerUserId,
        'Booking Cancelled',
        `${data.clientName ?? data.clientEmail} cancelled their booking${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.cancelled' },
        bookingNotifType('BOOKING_CANCELLED'),
      )
    }

    if (clientUserId && providerUserId) {
      await this.injectSystemMessage(
        clientUserId,
        providerUserId,
        'BOOKING_CANCELLED',
        `Booking cancelled: ${data.serviceName ?? 'a service'}${summary ? ` · ${summary}` : ''}`,
      )
    }
  }

  private async onBookingRescheduled(
    data: HavanaBookingPayload,
    clientUserId: string | undefined,
    providerUserId: string | null,
  ): Promise<void> {
    const summary = this.buildBookingSummary(data)

    if (clientUserId) {
      await this.notifications.sendPush(
        clientUserId,
        'Booking Rescheduled',
        `Your ${data.serviceName ?? 'appointment'} has been rescheduled${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.rescheduled' },
        bookingNotifType('BOOKING_RESCHEDULED'),
      )
    }
    if (providerUserId) {
      await this.notifications.sendPush(
        providerUserId,
        'Booking Rescheduled',
        `${data.clientName ?? data.clientEmail} rescheduled${summary ? ` · ${summary}` : ''}`,
        { bookingId: data.bookingId, event: 'booking.rescheduled' },
        bookingNotifType('BOOKING_RESCHEDULED'),
      )
    }

    if (clientUserId && providerUserId) {
      await this.injectSystemMessage(
        clientUserId,
        providerUserId,
        'BOOKING_RESCHEDULED',
        `Booking rescheduled: ${data.serviceName ?? 'a service'}${summary ? ` · ${summary}` : ''}`,
      )
    }
  }

  private async onPaymentCompleted(
    data: HavanaPaymentPayload,
    clientUserId: string | undefined,
    _providerUserId: string | null,
  ): Promise<void> {
    if (clientUserId) {
      const amount = data.amount != null
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency ?? 'USD', minimumFractionDigits: 0 }).format(data.amount)
        : ''
      await this.notifications.sendPush(
        clientUserId,
        'Payment Received',
        `Payment${amount ? ` of ${amount}` : ''} confirmed for your booking.`,
        { bookingId: data.bookingId, event: 'payment.completed', transactionId: data.transactionId },
        bookingNotifType('BOOKING_CONFIRMED'),
      )
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildBookingSummary(data: HavanaBookingPayload): string {
    const parts: string[] = []
    if (data.date) parts.push(data.date)
    if (data.startTime) parts.push(data.startTime)
    return parts.join(' ')
  }

  private async resolveProviderUser(
    providerId: string,
    providerType: string,
  ): Promise<string | null> {
    if (providerType === 'salon') {
      const salon = await this.prisma.salonProfile.findUnique({
        where: { id: providerId },
        select: { userId: true },
      })
      return salon?.userId ?? null
    }
    // professional
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true },
    })
    return worker?.userId ?? null
  }

  /**
   * Find or create a conversation between client and provider,
   * then insert an isSystem=true message with the booking type.
   */
  private async injectSystemMessage(
    clientUserId: string,
    providerUserId: string,
    messageType: 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED',
    content: string,
  ): Promise<void> {
    try {
      // Find existing conversation
      let conv = await this.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: clientUserId } } },
            { participants: { some: { userId: providerUserId } } },
          ],
        },
        select: { id: true },
      })

      // Create conversation if it doesn't exist yet
      if (!conv) {
        conv = await this.prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: clientUserId }, { userId: providerUserId }],
            },
          },
          select: { id: true },
        })
      }

      await this.prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: providerUserId, // system messages attributed to the provider
          content,
          type: messageType,
          isSystem: true,
          isRead: false,
        },
      })

      // Bump conversation updatedAt
      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      })
    } catch (err) {
      this.logger.error('Failed to inject system message', err)
    }
  }
}
