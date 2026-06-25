import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { BookingProfilesService } from './booking-profiles.service'
import { CreateBookingProfileDto } from './dto/create-booking-profile.dto'
import { GetProviderProfileDto } from './dto/get-provider-profile.dto'
import { UpdateBookingProfileDto } from './dto/update-booking-profile.dto'
import { AutoSetupBookingDto } from './dto/auto-setup-booking.dto'
import type { BookingProviderType } from '@salonin/types'

@Controller('booking-profiles')
export class BookingProfilesController {
  constructor(private readonly bookingProfilesService: BookingProfilesService) {}

  /**
   * GET /booking-profiles/stripe-key
   * Public — returns the Stripe publishable key from Havanabook's config endpoint.
   * Safe to expose publicly (Stripe publishable keys are client-side by design).
   */
  @Get('stripe-key')
  async getStripeKey() {
    const config = await this.bookingProfilesService.getHavanaConfig()
    return { data: { stripePublishableKey: config.stripePublishableKey } }
  }

  /**
   * POST /booking-profiles/auto-setup
   * Protected — creates a Havanabook tenant for the provider and stores credentials.
   * Called when a provider enables acceptsBookings for the first time.
   */
  @Post('auto-setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async autoSetup(@Body() dto: AutoSetupBookingDto) {
    const profile = await this.bookingProfilesService.autoSetupTenant(
      dto.providerId,
      dto.providerType as BookingProviderType,
      dto.businessName,
      dto.email,
      dto.phone,
    )
    return { data: profile }
  }

  /**
   * GET /booking-profiles/my-bookings
   * Protected — returns the authenticated client's bookings across all active Havana tenants.
   */
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@CurrentUser() user: User) {
    const bookings = await this.bookingProfilesService.getMyBookings(user.email ?? '')
    return { data: bookings }
  }

  /**
   * GET /booking-profiles/provider?providerId=xxx&providerType=professional
   * Public — mobile calls this to resolve a tenantSlug before hitting the external booking API.
   */
  @Get('provider')
  async getByProvider(@Query() query: GetProviderProfileDto) {
    const profile = await this.bookingProfilesService.getByProvider(
      query.providerId,
      query.providerType,
    )
    return { data: profile }
  }

  /**
   * POST /booking-profiles
   * Protected — only authenticated providers/admins can create a booking profile.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingProfileDto) {
    const profile = await this.bookingProfilesService.create(dto)
    return { data: profile }
  }

  /**
   * PATCH /booking-profiles/:id
   * Protected — update tenantSlug, externalBookingSystemId, or isActive.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateBookingProfileDto) {
    const profile = await this.bookingProfilesService.update(id, dto)
    return { data: profile }
  }
}
