import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'
import { SearchService } from './search.service'
import { SearchDto } from './dto/search.dto'

@Controller('search')
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ short: { limit: 60, ttl: 60000 } })
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  async search(@Query() dto: SearchDto) {
    return { data: await this.svc.search(dto) }
  }
}
