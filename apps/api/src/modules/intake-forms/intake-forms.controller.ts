import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IntakeFormsService } from './intake-forms.service'
import { CreateIntakeFormDto } from './dto/create-intake-form.dto'
import { UpdateIntakeFormDto } from './dto/update-intake-form.dto'

@Controller('intake-forms')
export class IntakeFormsController {
  constructor(private readonly svc: IntakeFormsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: User, @Body() dto: CreateIntakeFormDto) {
    return { data: await this.svc.create(user, dto) }
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyForms(@CurrentUser() user: User) {
    return { data: await this.svc.getMyForms(user) }
  }

  @Get('for-provider')
  async getForProvider(
    @Query('providerId') providerId: string,
    @Query('providerType') providerType: string,
  ) {
    return { data: await this.svc.getForProvider(providerId, providerType) }
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.svc.getById(id) }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntakeFormDto,
  ) {
    return { data: await this.svc.update(user, id, dto) }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.delete(user, id)
  }
}
