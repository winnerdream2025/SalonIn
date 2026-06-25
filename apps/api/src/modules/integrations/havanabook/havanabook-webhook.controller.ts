import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { HavanabookWebhookService } from './havanabook-webhook.service'

@Controller('integrations/havanabook')
export class HavanabookWebhookController {
  private readonly logger = new Logger(HavanabookWebhookController.name)

  constructor(private readonly webhookService: HavanabookWebhookService) {}

  /**
   * POST /integrations/havanabook/webhooks
   *
   * Havana sends a JSON payload with an `x-webhook-signature` header (HMAC-SHA256
   * of the raw request body, hex-encoded, keyed with HAVANA_WEBHOOK_SECRET).
   *
   * We validate the signature BEFORE parsing/trusting any payload field.
   */
  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-havana-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody
    if (!rawBody) {
      this.logger.error('rawBody is undefined — ensure NestFactory.create is called with { rawBody: true }')
      throw new UnauthorizedException('Invalid request')
    }

    const isValid = this.webhookService.verifySignature(rawBody, signature)
    if (!isValid) {
      this.logger.warn('Webhook signature mismatch — rejecting request')
      throw new UnauthorizedException('Invalid webhook signature')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw new UnauthorizedException('Malformed JSON body')
    }

    // Fire-and-forget — we already responded 200 to Havana
    void this.webhookService.handleEvent(parsed).catch((err: unknown) => {
      this.logger.error('Webhook handler error', err)
    })

    return { received: true }
  }
}
