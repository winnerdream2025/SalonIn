import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { VerifyService } from './verify.service'
import { SubmitEinDto } from './dto/submit-ein.dto'

@Controller()
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('verify/identity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WORKER')
  async createIdentitySession(@CurrentUser() user: User) {
    return this.verifyService.createIdentitySession(user.id)
  }

  @Post('verify/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body')
    await this.verifyService.handleWebhook(req.rawBody, sig)
    return { received: true }
  }

  @Patch('verify/salon/ein')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SALON')
  async submitEin(@CurrentUser() user: User, @Body() dto: SubmitEinDto) {
    await this.verifyService.submitEin(user.id, dto.ein)
    return { success: true }
  }

  @Patch('admin/salons/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async verifySalon(@Param('id', ParseUUIDPipe) id: string) {
    await this.verifyService.verifySalon(id)
    return { success: true }
  }
}
