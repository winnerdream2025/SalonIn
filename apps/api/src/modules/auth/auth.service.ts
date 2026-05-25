import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { Redis } from 'ioredis'
import { Role } from '@salonin/types'
import { PrismaService } from '../../prisma/prisma.service'
import {
  InvalidCredentialsException,
  UserAlreadyExistsException,
} from '../../common/exceptions/auth.exceptions'
import type { RegisterDto } from './dto/register.dto'
import type { LoginDto } from './dto/login.dto'

const REFRESH_TTL = 60 * 60 * 24 * 7
const SALT_ROUNDS = 12

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  private readonly redis: Redis

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'))
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new UserAlreadyExistsException()

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        passwordHash,
        ...(dto.role === Role.WORKER
          ? { workerProfile: { create: { name: dto.name, cityId: dto.cityId } } }
          : { salonProfile: { create: { name: dto.name, cityId: dto.cityId } } }),
      },
    })

    const tokens = await this.issueTokens(user.id, user.email)
    return { ...tokens, user }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user?.passwordHash) throw new InvalidCredentialsException()

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new InvalidCredentialsException()

    if (!user.isActive) throw new UnauthorizedException('Account suspended')

    const tokens = await this.issueTokens(user.id, user.email)
    return { ...tokens, user }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const userId = await this.redis.get(`refresh:${refreshToken}`)
    if (!userId) throw new InvalidCredentialsException()

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new InvalidCredentialsException()

    await this.redis.del(`refresh:${refreshToken}`)
    return this.issueTokens(user.id, user.email)
  }

  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(`refresh:${refreshToken}`)
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = this.jwt.sign({ sub: userId, email })
    const refreshToken = randomUUID()
    await this.redis.set(`refresh:${refreshToken}`, userId, 'EX', REFRESH_TTL)
    return { accessToken, refreshToken }
  }
}
