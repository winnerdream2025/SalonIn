import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
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

  private readonly logger = new Logger(PaymentsService.name)

  async createPaymentIntent(bookingId: string, requestingUserId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      include: { service: { select: { price: true, currency: true } } },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    // Ownership: only the booking's client may create a payment intent
    if ((booking.clientUserId as string | null) !== requestingUserId) {
      throw new ForbiddenException('You are not the client for this booking')
    }
    if (booking.price <= 0) throw new BadRequestException('Booking has no charge')

    // Determine charge: use deposit amount if provider requires deposit and it hasn't been paid yet
    const isDeposit = !!(booking.depositAmount && (booking.depositAmount as number) > 0 && !(booking.depositPaid as boolean))
    const chargeAmount = isDeposit ? (booking.depositAmount as number) : (booking.price as number)
    const amountCents = Math.round(chargeAmount * 100)

    // Resolve provider's Stripe account for Connect transfer
    const providerStripeAccountId = await this.resolveProviderStripeAccountId(
      booking.providerId as string,
      booking.providerType as string,
    )

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount:   amountCents,
      currency: (booking.currency as string).toLowerCase(),
      metadata: { bookingId, isDeposit: isDeposit ? 'true' : 'false' },
    }
    if (providerStripeAccountId) {
      intentParams.transfer_data = { destination: providerStripeAccountId }
      intentParams.application_fee_amount = Math.round(amountCents * 0.02) // 2% platform fee
    } else {
      // Provider has no Stripe Connect — charge still accepted but payout is manual.
      // Notify client so there's no silent money trap.
      this.logger.warn(`Booking ${bookingId}: provider has no Stripe Connect account — funds will stay on platform`)
      if ((booking.clientUserId as string | null)) {
        await this.notifications.sendPush(
          booking.clientUserId as string,
          'Payment Pending Setup',
          'Your payment is being processed. The provider will confirm your booking once their payment account is ready.',
          { bookingId, event: 'payment.no_connect' },
          'PAYMENT_RECEIVED' as never,
        ).catch(() => {})
      }
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
      // Mark depositPaid if this was a deposit payment; always confirm booking
      const wasDeposit = intent.metadata['isDeposit'] === 'true'
      await this.db.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', ...(wasDeposit ? { depositPaid: true } : {}) },
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
      const failedBookingId = intent.metadata['bookingId']
      await this.db.bookingPayment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'failed' },
      })
      // Cancel the PENDING_PAYMENT booking so the slot is freed
      if (failedBookingId) {
        const failedBooking = await this.db.booking.findUnique({ where: { id: failedBookingId } })
        if (failedBooking && failedBooking.status === 'PENDING_PAYMENT') {
          await this.db.booking.update({
            where: { id: failedBookingId },
            data: { status: 'CANCELLED', cancelReason: 'Payment failed' },
          })
          if (failedBooking.clientUserId) {
            await this.notifications.sendPush(
              failedBooking.clientUserId as string,
              'Payment Failed',
              'Your payment did not go through. The time slot has been released — please try booking again.',
              { bookingId: failedBookingId, event: 'payment.failed' },
              'PAYMENT_FAILED' as never,
            ).catch(() => {})
          }
        }
      }
    }
  }

  async refundBooking(bookingId: string, requestingUserId: string, reason?: string): Promise<{ refundId: string; amount: number }> {
    // Ownership: only the booking's client may request a refund
    const booking = await this.db.booking.findUnique({ where: { id: bookingId }, select: { clientUserId: true } })
    if (!booking) throw new NotFoundException('Booking not found')
    if ((booking.clientUserId as string | null) !== requestingUserId) {
      throw new ForbiddenException('You are not the client for this booking')
    }
    const payment = await this.db.bookingPayment.findUnique({ where: { bookingId } })
    if (!payment) throw new NotFoundException('No payment found for this booking')
    if (!payment.stripePaymentIntentId) throw new BadRequestException('Payment intent not found')
    if (payment.status === 'refunded') throw new BadRequestException('Booking has already been refunded')
    if (payment.status !== 'succeeded') throw new BadRequestException('Cannot refund a payment that has not succeeded')

    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId as string,
      reason: 'requested_by_customer',
      metadata: { bookingId, ...(reason ? { reason } : {}) },
    })

    await this.db.bookingPayment.update({
      where: { bookingId },
      data: { status: 'refunded' },
    })
    await this.db.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason ?? 'Refunded' },
    })

    return { refundId: refund.id, amount: (payment.amount as number) }
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
