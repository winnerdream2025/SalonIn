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
import type { User } from '@salonin/types'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { WorkersService } from './workers.service'
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto'
import { UpdateAvailabilityDto } from './dto/update-availability.dto'
import { UpdateLocationDto } from './dto/update-location.dto'
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto'
import { MatchingService } from '../matching/matching.service'
import { FindNearbyWorkersDto } from '../matching/dto/find-nearby-workers.dto'

@Controller('workers')
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly matchingService: MatchingService,
  ) {}

  @Get('nearby')
  findNearby(@Query() dto: FindNearbyWorkersDto) {
    return this.matchingService.findNearbyWorkers(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser() user: User) {
    return this.workersService.getMyProfile(user.id)
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.workersService.getProfile(id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateWorkerProfileDto) {
    return this.workersService.updateProfile(user.id, dto)
  }

  @Patch('availability')
  @UseGuards(JwtAuthGuard)
  updateAvailability(@CurrentUser() user: User, @Body() dto: UpdateAvailabilityDto) {
    return this.workersService.updateAvailability(user.id, dto)
  }

  @Post('location')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateLocationDto,
  ): Promise<void> {
    await this.workersService.updateLocation(user.id, dto)
  }

  @Post('portfolio')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addPortfolioItem(@CurrentUser() user: User, @Body() dto: AddPortfolioItemDto) {
    return this.workersService.addPortfolioItem(user.id, dto)
  }
}
