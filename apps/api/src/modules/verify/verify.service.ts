import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class VerifyService {
  private readonly stripe: Stripe

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'))
  }

  async createIdentitySession(userId: string): Promise<{ url: string; sessionId: string }> {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true, isVerified: true },
    })
    if (!worker) throw new NotFoundException('Worker profile not found')
    if (worker.isVerified) throw new BadRequestException('Already verified')

    const session = await this.stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { workerId: worker.id },
    })

    const sessionUrl = session.url
    if (!sessionUrl) {
      throw new InternalServerErrorException('Failed to create verification session URL')
    }

    await this.prisma.workerProfile.update({
      where: { id: worker.id },
      data: { stripeSessionId: session.id },
    })

    return { url: sessionUrl, sessionId: session.id }
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET')

    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch {
      throw new BadRequestException('Invalid webhook signature')
    }

    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const workerId = session.metadata['workerId']
      if (workerId) {
        await this.prisma.workerProfile.update({
          where: { id: workerId },
          data: { isVerified: true, stripeSessionId: null },
        })
      }
    }
  }

  async submitEin(userId: string, ein: string): Promise<void> {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!salon) throw new NotFoundException('Salon profile not found')

    await this.prisma.salonProfile.update({
      where: { id: salon.id },
      data: { ein },
    })
  }

  async verifySalon(salonId: string): Promise<void> {
    const salon = await this.prisma.salonProfile.findUnique({
      where: { id: salonId },
      select: { id: true },
    })
    if (!salon) throw new NotFoundException('Salon not found')

    await this.prisma.salonProfile.update({
      where: { id: salonId },
      data: { isVerified: true },
    })
  }
}
