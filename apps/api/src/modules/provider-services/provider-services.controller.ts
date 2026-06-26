import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { User } from '@salonin/types'
import { ProviderServicesService, type ServiceDto } from './provider-services.service'

@Controller('services')
export class ProviderServicesController {
  constructor(private readonly svc: ProviderServicesService) {}

  @Get()
  async list(@Query('providerId') providerId: string, @Query('providerType') providerType: string) {
    return { data: await this.svc.list(providerId, providerType) }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: User, @Body() dto: ServiceDto) {
    return { data: await this.svc.create(user, dto) }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: Partial<ServiceDto>) {
    return { data: await this.svc.update(user, id, dto) }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.svc.remove(user, id)
  }
}
