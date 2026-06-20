import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
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
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'
import { EmailService } from '../email/email.service'

const REFRESH_TTL = 60 * 60 * 24 * 30
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
    private readonly emailService: EmailService,
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
          ? { workerProfile: { create: { name: dto.name } } }
          : { salonProfile: { create: { name: dto.name } } }),
      },
    })

    const tokens = await this.issueTokens(user.id, user.email, user.role)
    const { passwordHash: _pw, ...safeUser } = user
    return { ...tokens, user: safeUser }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user?.passwordHash) throw new InvalidCredentialsException()

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new InvalidCredentialsException()

    if (!user.isActive) throw new UnauthorizedException('Account suspended')

    const tokens = await this.issueTokens(user.id, user.email, user.role)
    const { passwordHash: _pw, ...safeUser } = user
    return { ...tokens, user: safeUser }
  }

  async refresh(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`)
    if (!userId) throw new InvalidCredentialsException()

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new InvalidCredentialsException()

    await this.redis.del(`refresh:${refreshToken}`)
    const tokens = await this.issueTokens(user.id, user.email, user.role)
    const { passwordHash: _pw, ...safeUser } = user
    return { ...tokens, user: safeUser }
  }

  async logout(refreshToken: string): Promise<void> {
    const userId = await this.redis.get(`refresh:${refreshToken}`)
    await this.redis.del(`refresh:${refreshToken}`)
    if (userId) {
      await this.prisma.userDevice.deleteMany({ where: { userId } })
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userDevice.deleteMany({ where: { userId } })

      const worker = await tx.workerProfile.findUnique({ where: { userId }, select: { id: true } })
      const salon = await tx.salonProfile.findUnique({ where: { userId }, select: { id: true } })

      if (worker) {
        await tx.portfolioItem.deleteMany({ where: { workerId: worker.id } })
        await tx.jobApplication.deleteMany({ where: { workerId: worker.id } })
      }

      if (salon) {
        const jobIds = (await tx.jobPost.findMany({ where: { salonId: salon.id }, select: { id: true } })).map((j) => j.id)
        if (jobIds.length) await tx.jobApplication.deleteMany({ where: { jobId: { in: jobIds } } })
        await tx.jobPost.deleteMany({ where: { salonId: salon.id } })
      }

      await tx.conversationParticipant.deleteMany({ where: { userId } })
      await tx.message.deleteMany({ where: { senderId: userId } })
      await tx.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } })

      if (worker) await tx.workerProfile.delete({ where: { userId } })
      if (salon) await tx.salonProfile.delete({ where: { userId } })

      await tx.user.delete({ where: { id: userId } })
    })

    // Use SCAN instead of KEYS to avoid blocking Redis
    const keys: string[] = []
    let cursor = '0'
    do {
      const [next, found] = await this.redis.scan(cursor, 'MATCH', 'refresh:*', 'COUNT', 100)
      cursor = next
      keys.push(...found)
    } while (cursor !== '0')

    await Promise.all(
      keys.map(async (key) => {
        const val = await this.redis.get(key)
        if (val === userId) await this.redis.del(key)
      }),
    )
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) return

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    })

    const baseUrl = process.env.WEB_URL ?? 'https://salonin-production-77fc.up.railway.app'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const profile = await this.prisma.workerProfile.findUnique({ where: { userId: user.id }, select: { name: true } })
      ?? await this.prisma.salonProfile.findUnique({ where: { userId: user.id }, select: { name: true } })
    const userName = profile?.name ?? user.email.split('@')[0]

    await this.emailService.sendPasswordReset(user.email, resetUrl, userName)
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordReset.findUnique({ where: { token: dto.token } })

    if (!record) throw new BadRequestException('Invalid or expired reset token')
    if (record.usedAt) throw new BadRequestException('Reset token already used')
    if (record.expiresAt < new Date()) throw new BadRequestException('Reset token expired')

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    // Use SCAN instead of KEYS to avoid blocking Redis
    const refreshKeys: string[] = []
    let cursor = '0'
    do {
      const [next, found] = await this.redis.scan(cursor, 'MATCH', 'refresh:*', 'COUNT', 100)
      cursor = next
      refreshKeys.push(...found)
    } while (cursor !== '0')

    await Promise.all(
      refreshKeys.map(async (key) => {
        const val = await this.redis.get(key)
        if (val === record.userId) await this.redis.del(key)
      }),
    )
  }

  private async issueTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const accessToken = this.jwt.sign({ sub: userId, email, role }, { expiresIn: '15m' })
    const refreshToken = randomUUID()
    await this.redis.set(`refresh:${refreshToken}`, userId, 'EX', REFRESH_TTL)
    return { accessToken, refreshToken }
  }
}
