import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../../prisma/prisma.service'
import type { User } from '@salonin/types'

@Injectable()
export class StripeConnectService {
  private readonly stripe: Stripe

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
  }

  private async resolveProfile(user: User): Promise<{
    profileId: string
    profileType: 'worker' | 'salon'
    stripeAccountId: string | null
    stripeConnectEnabled: boolean
  }> {
    if (user.role === 'SALON') {
      const salon = await this.prisma.salonProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, stripeAccountId: true, stripeConnectEnabled: true } as never,
      }) as { id: string; stripeAccountId: string | null; stripeConnectEnabled: boolean } | null
      if (!salon) throw new NotFoundException('Salon profile not found')
      return { profileId: salon.id, profileType: 'salon', stripeAccountId: salon.stripeAccountId, stripeConnectEnabled: salon.stripeConnectEnabled }
    }
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, stripeAccountId: true, stripeConnectEnabled: true } as never,
    }) as { id: string; stripeAccountId: string | null; stripeConnectEnabled: boolean } | null
    if (!worker) throw new NotFoundException('Worker profile not found')
    return { profileId: worker.id, profileType: 'worker', stripeAccountId: worker.stripeAccountId, stripeConnectEnabled: worker.stripeConnectEnabled }
  }

  async getStatus(user: User): Promise<{ connected: boolean; accountId: string | null; onboardingUrl: string | null }> {
    const { stripeAccountId, stripeConnectEnabled } = await this.resolveProfile(user)
    if (!stripeAccountId) {
      return { connected: false, accountId: null, onboardingUrl: null }
    }
    try {
      const account = await this.stripe.accounts.retrieve(stripeAccountId)
      const connected = account.charges_enabled && stripeConnectEnabled
      return { connected: !!connected, accountId: stripeAccountId, onboardingUrl: null }
    } catch {
      return { connected: false, accountId: stripeAccountId, onboardingUrl: null }
    }
  }

  async startOnboarding(user: User, returnUrl: string): Promise<{ onboardingUrl: string }> {
    const { profileId, profileType, stripeAccountId } = await this.resolveProfile(user)

    let accountId = stripeAccountId
    if (!accountId) {
      const account = await this.stripe.accounts.create({ type: 'express' })
      accountId = account.id
      if (profileType === 'salon') {
        await (this.prisma.salonProfile as never as { update: (a: unknown) => Promise<unknown> }).update({
          where: { id: profileId },
          data: { stripeAccountId: accountId },
        })
      } else {
        await (this.prisma.workerProfile as never as { update: (a: unknown) => Promise<unknown> }).update({
          where: { id: profileId },
          data: { stripeAccountId: accountId },
        })
      }
    }

    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url:  returnUrl,
      type: 'account_onboarding',
    })

    return { onboardingUrl: link.url }
  }

  async handleConnectWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? ''
    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, secret)
    } catch {
      throw new ForbiddenException('Invalid Stripe Connect signature')
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled) {
        await this.prisma.workerProfile.updateMany({
          where: { stripeAccountId: account.id } as never,
          data: { stripeConnectEnabled: true } as never,
        })
        await this.prisma.salonProfile.updateMany({
          where: { stripeAccountId: account.id } as never,
          data: { stripeConnectEnabled: true } as never,
        })
      }
    }
  }
}
