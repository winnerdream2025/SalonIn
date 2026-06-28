import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { StripeConnectService } from './stripe-connect.service'

@Controller('stripe-connect')
export class StripeConnectController {
  constructor(private readonly svc: StripeConnectService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() user: User) {
    return { data: await this.svc.getStatus(user) }
  }

  @Get('dashboard-url')
  @UseGuards(JwtAuthGuard)
  async dashboardUrl(@CurrentUser() user: User) {
    return { data: await this.svc.getDashboardUrl(user) }
  }

  @Post('onboard')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async onboard(@CurrentUser() user: User, @Body('returnUrl') returnUrl: string) {
    const url = returnUrl ?? `${process.env.WEB_URL ?? 'https://mysalonin.com'}/dashboard`
    return { data: await this.svc.startOnboarding(user, url) }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.svc.handleConnectWebhook(req.rawBody!, sig)
    return { received: true }
  }
}
