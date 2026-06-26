import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { ListUsersDto, ListReportsDto, ResolveReportDto, AnalyticsPeriodDto } from './dto/admin.dto'

const DEFAULT_LIMIT = 20

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const limit = dto.limit ?? DEFAULT_LIMIT
    const page = dto.page ?? 1
    const skip = (page - 1) * limit

    const where: any = {}
    if (dto.role) where.role = dto.role
    if (dto.accountType) where.accountType = dto.accountType
    if (dto.isActive !== undefined) where.isActive = dto.isActive
    if (dto.q) {
      where.OR = [
        { email: { contains: dto.q, mode: 'insensitive' } },
        { workerProfile: { name: { contains: dto.q, mode: 'insensitive' } } },
        { salonProfile: { name: { contains: dto.q, mode: 'insensitive' } } },
        { clientProfile: { name: { contains: dto.q, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          accountType: true,
          isActive: true,
          createdAt: true,
          lastSeenAt: true,
          workerProfile: { select: { id: true, name: true, isVerified: true, rating: true } },
          salonProfile: { select: { id: true, name: true, isVerified: true, rating: true } },
          clientProfile: { select: { id: true, name: true } },
          _count: { select: { reportsReceived: true, reportsGiven: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return { data, total, page, limit, hasMore: skip + limit < total }
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        accountType: true,
        isActive: true,
        createdAt: true,
        lastSeenAt: true,
        workerProfile: {
          select: {
            id: true, name: true, bio: true, specialties: true, city: true, state: true,
            isVerified: true, rating: true, reviewCount: true, availability: true,
          },
        },
        salonProfile: {
          select: {
            id: true, name: true, description: true, specialties: true, city: true, state: true,
            isVerified: true, rating: true, reviewCount: true, isHiring: true,
          },
        },
        clientProfile: { select: { id: true, name: true, phone: true, city: true, state: true } },
        reportsReceived: {
          select: { id: true, type: true, reason: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reportsReceived: true, reportsGiven: true, followers: true, following: true } },
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async suspendUser(adminId: string, userId: string) {
    if (adminId === userId) throw new ForbiddenException('Cannot suspend yourself')
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
    if (!user) throw new NotFoundException('User not found')
    if (user.role === 'ADMIN') throw new ForbiddenException('Cannot suspend another admin')
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    })
  }

  async activateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new NotFoundException('User not found')
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: { id: true, email: true, isActive: true },
    })
  }

  async verifyUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, workerProfile: { select: { id: true } }, salonProfile: { select: { id: true } } },
    })
    if (!user) throw new NotFoundException('User not found')

    const updates: Promise<unknown>[] = []
    if (user.workerProfile) {
      updates.push(this.prisma.workerProfile.update({
        where: { id: user.workerProfile.id },
        data: { isVerified: true },
      }))
    }
    if (user.salonProfile) {
      updates.push(this.prisma.salonProfile.update({
        where: { id: user.salonProfile.id },
        data: { isVerified: true },
      }))
    }
    if (!updates.length) throw new NotFoundException('No professional or salon profile to verify')
    await Promise.all(updates)
    return { userId, verified: true }
  }

  async deleteUser(adminId: string, userId: string) {
    if (adminId === userId) throw new ForbiddenException('Cannot delete yourself')
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        workerProfile: { select: { id: true } },
        salonProfile: { select: { id: true } },
        clientProfile: { select: { id: true } },
      },
    })
    if (!user) throw new NotFoundException('User not found')
    if (user.role === 'ADMIN') throw new ForbiddenException('Cannot delete another admin')

    // Delete profiles first (no CASCADE on userId FK)
    await Promise.all([
      user.workerProfile ? this.prisma.workerProfile.delete({ where: { id: user.workerProfile.id } }) : null,
      user.salonProfile ? this.prisma.salonProfile.delete({ where: { id: user.salonProfile.id } }) : null,
      user.clientProfile ? this.prisma.clientProfile.delete({ where: { id: user.clientProfile.id } }) : null,
    ].filter(Boolean))

    await this.prisma.user.delete({ where: { id: userId } })
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  async listReports(dto: ListReportsDto) {
    const limit = dto.limit ?? DEFAULT_LIMIT
    const page = dto.page ?? 1
    const skip = (page - 1) * limit

    const where: any = {}
    if (dto.status) where.status = dto.status
    if (dto.type) where.type = dto.type

    const [data, total] = await this.prisma.$transaction([
      this.db.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, reason: true, status: true, adminNote: true,
          resolvedAt: true, resolvedBy: true, createdAt: true,
          reporter: { select: { id: true, email: true, workerProfile: { select: { name: true } }, salonProfile: { select: { name: true } }, clientProfile: { select: { name: true } } } },
          reported: { select: { id: true, email: true, workerProfile: { select: { name: true } }, salonProfile: { select: { name: true } }, clientProfile: { select: { name: true } } } },
        },
      }),
      this.db.report.count({ where }),
    ])

    return { data, total, page, limit, hasMore: skip + limit < total }
  }

  async resolveReport(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.db.report.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException('Report not found')
    return this.db.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote ?? null,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
    })
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(dto: AnalyticsPeriodDto) {
    const period = dto.period ?? '30d'
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period] ?? 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      newUsers,
      usersByRole,
      activeWorkers,
      activeSalons,
      totalBookings,
      bookingsByStatus,
      revenueResult,
      totalPosts,
      totalJobs,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      this.prisma.workerProfile.count({ where: { user: { isActive: true } } }),
      this.prisma.salonProfile.count({ where: { user: { isActive: true } } }),
      this.db.booking.count(),
      this.db.booking.groupBy({ by: ['status'], _count: { id: true } }),
      this.db.booking.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { price: true },
      }),
      this.db.post.count(),
      this.db.jobPost.count({ where: { isActive: true } }),
      this.db.report.count({ where: { status: 'PENDING' } }),
    ])

    const [newBookings, revenueThisPeriod] = await Promise.all([
      this.db.booking.count({ where: { createdAt: { gte: since } } }),
      this.db.booking.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: since } },
        _sum: { price: true },
      }),
    ])

    return {
      period,
      since: since.toISOString(),
      users: {
        total: totalUsers,
        newThisPeriod: newUsers,
        byRole: Object.fromEntries(usersByRole.map((r: any) => [r.role, r._count.id])),
        activeWorkers,
        activeSalons,
      },
      bookings: {
        total: totalBookings,
        newThisPeriod: newBookings,
        byStatus: Object.fromEntries(bookingsByStatus.map((b: any) => [b.status, b._count.id])),
        revenueAllTime: revenueResult._sum?.price ?? 0,
        revenueThisPeriod: revenueThisPeriod._sum?.price ?? 0,
      },
      content: {
        totalPosts,
        activeJobs: totalJobs,
      },
      moderation: {
        pendingReports,
      },
    }
  }
}
