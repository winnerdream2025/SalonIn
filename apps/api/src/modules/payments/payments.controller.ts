import { Body, Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { PaymentsService } from './payments.service'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createIntent(@CurrentUser() user: User, @Body('bookingId') bookingId: string) {
    return { data: await this.svc.createPaymentIntent(bookingId, user.id) }
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refund(@CurrentUser() user: User, @Body('bookingId') bookingId: string, @Body('reason') reason?: string) {
    return { data: await this.svc.refundBooking(bookingId, user.id, reason) }
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
