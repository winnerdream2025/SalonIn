import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PlacesService } from './places.service'
import { AutocompleteDto, PlaceDetailsDto, ReverseGeocodeDto } from './dto/place-queries.dto'

@Controller('places')
@UseGuards(JwtAuthGuard)
@Throttle({ short: { limit: 30, ttl: 60_000 } })
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('autocomplete')
  autocomplete(@Query() dto: AutocompleteDto) {
    return this.places.autocomplete(dto.input)
  }

  @Get('details')
  details(@Query() dto: PlaceDetailsDto) {
    return this.places.details(dto.placeId)
  }

  @Get('reverse')
  reverse(@Query() dto: ReverseGeocodeDto) {
    return this.places.reverse(dto.lat, dto.lng)
  }
}
