import { Controller, Get, Header } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { BEAUTY_SPECIALTIES } from '@salonin/config'

@Controller('specialties')
export class SpecialtiesController {
  @Get()
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=3600')
  getAll(): Record<string, string[]> {
    return BEAUTY_SPECIALTIES
  }
}
