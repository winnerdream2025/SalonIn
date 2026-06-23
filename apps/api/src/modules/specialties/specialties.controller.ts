import { Controller, Get, Header } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { BEAUTY_SPECIALTIES, SPECIALTY_CATEGORIES } from '@salonin/config'
import type { Specialty, SpecialtyCategory } from '@salonin/config'

@Controller('specialties')
export class SpecialtiesController {
  @Get()
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=3600')
  getAll(): { categories: SpecialtyCategory[]; specialties: Specialty[] } {
    return { categories: SPECIALTY_CATEGORIES, specialties: BEAUTY_SPECIALTIES }
  }
}
