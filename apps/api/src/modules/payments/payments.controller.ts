import { Body, Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PaymentsService } from './payments.service'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createIntent(@Body('bookingId') bookingId: string) {
    return { data: await this.svc.createPaymentIntent(bookingId) }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.svc.handleWebhook(req.rawBody!, sig)
    return { received: true }
  }
}
