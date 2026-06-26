import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.prisma as any }

  async createPaymentIntent(bookingId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      include: { service: { select: { price: true, currency: true } } },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.price <= 0) throw new BadRequestException('Booking has no charge')

    const amountCents = Math.round((booking.price as number) * 100)

    // Resolve provider's Stripe account for Connect transfer
    const providerStripeAccountId = await this.resolveProviderStripeAccountId(
      booking.providerId as string,
      booking.providerType as string,
    )

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount:   amountCents,
      currency: (booking.currency as string).toLowerCase(),
      metadata: { bookingId },
    }
    if (providerStripeAccountId) {
      intentParams.transfer_data = { destination: providerStripeAccountId }
      intentParams.application_fee_amount = Math.round(amountCents * 0.02) // 2% platform fee
    }

    const intent = await this.stripe.paymentIntents.create(intentParams)

    await this.db.bookingPayment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        stripePaymentIntentId: intent.id,
        amount:   booking.price as number,
        currency: booking.currency as string,
        status:   'pending',
      },
      update: { stripePaymentIntentId: intent.id, status: 'pending' },
    })

    return { clientSecret: intent.client_secret!, paymentIntentId: intent.id }
  }

  async handleWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch {
      throw new BadRequestException('Invalid Stripe signature')
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent
      const bookingId = intent.metadata['bookingId']
      if (!bookingId) return

      await this.db.bookingPayment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'succeeded', paidAt: new Date() },
      })
      await this.db.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      })

      const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
      if (booking?.clientUserId) {
        await this.notifications.sendPush(
          booking.clientUserId as string,
          'Payment Confirmed',
          `Payment received — your booking is confirmed for ${booking.date as string}`,
          { bookingId, event: 'payment.succeeded' },
          'BOOKING_CONFIRMED',
        )
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      await this.db.bookingPayment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'failed' },
      })
    }
  }

  private async resolveProviderStripeAccountId(providerId: string, providerType: string): Promise<string | null> {
    if (providerType === 'salon') {
      const salon = await this.prisma.salonProfile.findUnique({
        where: { id: providerId },
        select: { stripeAccountId: true, stripeConnectEnabled: true } as never,
      })
      const s = salon as { stripeAccountId?: string | null; stripeConnectEnabled?: boolean } | null
      return s?.stripeConnectEnabled ? (s.stripeAccountId ?? null) : null
    }
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: providerId },
      select: { stripeAccountId: true, stripeConnectEnabled: true } as never,
    })
    const w = worker as { stripeAccountId?: string | null; stripeConnectEnabled?: boolean } | null
    return w?.stripeConnectEnabled ? (w.stripeAccountId ?? null) : null
  }
}
