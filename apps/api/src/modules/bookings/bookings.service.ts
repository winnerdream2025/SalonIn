import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createId } from '@paralleldrive/cuid2'
import { NotificationType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { User } from '@salonin/types'
import type { CreateBookingDto, RescheduleDto } from './dto/booking.dto'

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.prisma as any }

  private async resolveProviderId(user: User): Promise<{ providerId: string; providerType: string }> {
    if (user.role === 'SALON') {
      const salon = await this.prisma.salonProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      if (!salon) throw new ForbiddenException('No salon profile found')
      return { providerId: salon.id, providerType: 'salon' }
    }
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
    if (!worker) throw new ForbiddenException('No worker profile found')
    return { providerId: worker.id, providerType: 'professional' }
  }

  private computeEndTime(startTime: string, durationMinutes: number): string {
    const [h = '0', m = '0'] = startTime.split(':')
    const totalMins = parseInt(h, 10) * 60 + parseInt(m, 10) + durationMinutes
    return `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`
  }

  async create(dto: CreateBookingDto, clientUserId?: string) {
    const service = await this.db.providerService.findUnique({ where: { id: dto.serviceId } })
    if (!service) throw new NotFoundException('Service not found')
    if (!service.isActive) throw new BadRequestException('Service is no longer available')

    const endTime = this.computeEndTime(dto.startTime, service.duration as number)

    try {
      const booking = await this.db.booking.create({
        data: {
          providerId:    dto.providerId,
          providerType:  dto.providerType,
          serviceId:     dto.serviceId,
          clientUserId:  clientUserId ?? null,
          clientName:    dto.clientName,
          clientEmail:   dto.clientEmail,
          clientPhone:   dto.clientPhone ?? null,
          date:          dto.date,
          startTime:     dto.startTime,
          endTime,
          price:         service.price,
          currency:      service.currency,
          notes:         dto.notes ?? null,
          cancelToken:   createId(),
          rescheduleToken: createId(),
          confirmationCode: `BK-${createId().slice(0, 8).toUpperCase()}`,
          cancelTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        include: { service: true },
      })

      // Push notification to provider
      const providerUserId = await this.resolveProviderUserId(dto.providerId, dto.providerType)
      if (providerUserId) {
        await this.notifications.sendPush(
          providerUserId,
          'New Booking',
          `${dto.clientName} booked ${service.name as string} · ${dto.date} ${dto.startTime}`,
          { bookingId: booking.id, event: 'booking.created' },
          'BOOKING_CREATED',
        )
      }

      return booking
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e.code === 'P2002') throw new ConflictException('This time slot is already booked')
      throw err
    }
  }

  async getMyBookings(clientEmail: string, clientUserId?: string) {
    return this.db.booking.findMany({
      where: {
        OR: [
          { clientEmail },
          ...(clientUserId ? [{ clientUserId }] : []),
        ],
      },
      include: { service: { select: { name: true, category: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    })
  }

  async getProviderBookings(user: User, status?: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    return this.db.booking.findMany({
      where: {
        providerId,
        providerType,
        ...(status ? { status } : {}),
      },
      include: { service: { select: { name: true, category: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    })
  }

  async confirm(user: User, bookingId: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.providerId !== providerId || booking.providerType !== providerType) {
      throw new ForbiddenException('Not your booking')
    }
    const updated = await this.db.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    })
    if (booking.clientUserId) {
      await this.notifications.sendPush(
        booking.clientUserId as string,
        'Booking Confirmed',
        `Your appointment is confirmed · ${booking.date as string} ${booking.startTime as string}`,
        { bookingId, event: 'booking.confirmed' },
        'BOOKING_CONFIRMED',
      )
    }
    return updated
  }

  async cancelByProvider(user: User, bookingId: string, reason?: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.providerId !== providerId || booking.providerType !== providerType) {
      throw new ForbiddenException('Not your booking')
    }
    const updated = await this.db.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason ?? null },
    })
    if (booking.clientUserId) {
      await this.notifications.sendPush(
        booking.clientUserId as string,
        'Booking Cancelled',
        `Your appointment on ${booking.date as string} has been cancelled`,
        { bookingId, event: 'booking.cancelled' },
        'BOOKING_CANCELLED',
      )
    }
    return updated
  }

  async cancelByClient(cancelToken: string, bookingId: string) {
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.cancelToken !== cancelToken) throw new ForbiddenException('Invalid cancel token')
    if (booking.cancelTokenExpiresAt && new Date() > new Date(booking.cancelTokenExpiresAt as string)) {
      throw new ForbiddenException('Cancel token expired')
    }
    const updated = await this.db.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: 'Cancelled by client' },
    })
    const providerUserId = await this.resolveProviderUserId(booking.providerId as string, booking.providerType as string)
    if (providerUserId) {
      await this.notifications.sendPush(
        providerUserId,
        'Booking Cancelled',
        `${booking.clientName as string} cancelled their appointment on ${booking.date as string}`,
        { bookingId, event: 'booking.cancelled' },
        'BOOKING_CANCELLED',
      )
    }
    return updated
  }

  async rescheduleByClient(token: string, bookingId: string, dto: RescheduleDto) {
    const booking = await this.db.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ cancelToken: token }, { rescheduleToken: token }],
      },
    })
    if (!booking) throw new NotFoundException('Booking not found or invalid token')

    const service = await this.db.providerService.findUnique({ where: { id: booking.serviceId } })
    const endTime = this.computeEndTime(dto.startTime, service?.duration ?? 60)

    try {
      const updated = await this.db.booking.update({
        where: { id: bookingId },
        data: {
          date: dto.date,
          startTime: dto.startTime,
          endTime,
          status: 'PENDING',
          rescheduleToken: createId(),
        },
      })
      if (booking.clientUserId) {
        await this.notifications.sendPush(
          booking.clientUserId as string,
          'Booking Rescheduled',
          `Your appointment has been moved to ${dto.date} ${dto.startTime}`,
          { bookingId, event: 'booking.rescheduled' },
          'BOOKING_RESCHEDULED',
        )
      }
      return updated
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e.code === 'P2002') throw new ConflictException('This time slot is already booked')
      throw err
    }
  }

  async rescheduleByProvider(user: User, bookingId: string, date: string, startTime: string, reason?: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.providerId !== providerId || booking.providerType !== providerType) {
      throw new ForbiddenException('Not your booking')
    }
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(booking.status as string)) {
      throw new BadRequestException('Cannot reschedule a cancelled or completed booking')
    }
    const service = await this.db.providerService.findUnique({ where: { id: booking.serviceId } })
    const endTime = this.computeEndTime(startTime, (service?.duration as number | undefined) ?? 60)
    try {
      const updated = await this.db.booking.update({
        where: { id: bookingId },
        data: {
          date,
          startTime,
          endTime,
          status: 'CONFIRMED',
          ...(reason ? { cancelReason: reason } : {}),
        },
        include: { service: { select: { name: true, category: true } } },
      })
      if (booking.clientUserId) {
        await this.notifications.sendPush(
          booking.clientUserId as string,
          'Appointment Rescheduled',
          `Your appointment has been moved to ${date} at ${startTime}`,
          { bookingId, event: 'booking.rescheduled' },
          'BOOKING_RESCHEDULED',
        )
      }
      return updated
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e.code === 'P2002') throw new ConflictException('This time slot is already booked')
      throw err
    }
  }

  async complete(user: User, bookingId: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.providerId !== providerId || booking.providerType !== providerType) {
      throw new ForbiddenException('Not your booking')
    }
    const updated = await this.db.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } })
    if (booking.clientUserId) {
      await this.notifications.sendPush(
        booking.clientUserId as string,
        'Appointment Completed',
        `Thank you for visiting! We hope to see you again soon.`,
        { bookingId, event: 'booking.completed' },
        NotificationType.BOOKING_COMPLETED,
      )
    }
    return updated
  }

  async noShow(user: User, bookingId: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const booking = await this.db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.providerId !== providerId || booking.providerType !== providerType) {
      throw new ForbiddenException('Not your booking')
    }
    if (!['PENDING', 'CONFIRMED'].includes(booking.status as string)) {
      throw new BadRequestException('Only pending or confirmed bookings can be marked as no-show')
    }
    return this.db.booking.update({ where: { id: bookingId }, data: { status: 'NO_SHOW' } })
  }

  async getProviderBookingsFiltered(
    user: User,
    opts: {
      status?: string
      dateFilter?: 'today' | 'tomorrow' | 'week' | 'month'
      dateFrom?: string
      dateTo?: string
      serviceId?: string
      search?: string
    },
  ) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const monthEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    let dateWhere: Record<string, unknown> = {}
    if (opts.dateFilter === 'today') dateWhere = { date: today }
    else if (opts.dateFilter === 'tomorrow') dateWhere = { date: tomorrow }
    else if (opts.dateFilter === 'week') dateWhere = { date: { gte: today, lte: weekEnd } }
    else if (opts.dateFilter === 'month') dateWhere = { date: { gte: today, lte: monthEnd } }
    else if (opts.dateFrom || opts.dateTo) {
      dateWhere = { date: { ...(opts.dateFrom ? { gte: opts.dateFrom } : {}), ...(opts.dateTo ? { lte: opts.dateTo } : {}) } }
    }

    const searchWhere = opts.search ? {
      OR: [
        { clientName: { contains: opts.search, mode: 'insensitive' } },
        { confirmationCode: { contains: opts.search, mode: 'insensitive' } },
        { clientEmail: { contains: opts.search, mode: 'insensitive' } },
      ],
    } : {}

    return this.db.booking.findMany({
      where: {
        providerId,
        providerType,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.serviceId ? { serviceId: opts.serviceId } : {}),
        ...dateWhere,
        ...searchWhere,
      },
      include: { service: { select: { id: true, name: true, category: true, duration: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  }

  async getAnalytics(user: User, period: '7d' | '30d' | '90d' | '1y' = '30d') {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    const bookings = await this.db.booking.findMany({
      where: { providerId, providerType, date: { gte: dateFrom } },
      include: { service: { select: { id: true, name: true } } },
    })

    const total = bookings.length as number
    const completed = (bookings as { status: string; price: number }[]).filter(b => b.status === 'COMPLETED').length
    const cancelled = (bookings as { status: string }[]).filter(b => b.status === 'CANCELLED').length
    const noShows  = (bookings as { status: string }[]).filter(b => b.status === 'NO_SHOW').length
    const revenue  = (bookings as { status: string; price: number }[]).filter(b => b.status === 'COMPLETED').reduce((s, b) => s + b.price, 0)

    const serviceCounts: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const b of bookings as { status: string; price: number; service: { id: string; name: string } | null }[]) {
      if (!b.service) continue
      if (!serviceCounts[b.service.id]) serviceCounts[b.service.id] = { name: b.service.name, count: 0, revenue: 0 }
      serviceCounts[b.service.id]!.count++
      if (b.status === 'COMPLETED') serviceCounts[b.service.id]!.revenue += b.price
    }
    const topServices = Object.values(serviceCounts).sort((a, b) => b.count - a.count).slice(0, 5)

    const clientEmails: Record<string, number> = {}
    for (const b of bookings as { clientEmail: string }[]) {
      clientEmails[b.clientEmail] = (clientEmails[b.clientEmail] ?? 0) + 1
    }
    const repeatClients = Object.values(clientEmails).filter(c => c > 1).length

    return {
      period,
      total,
      completed,
      cancelled,
      noShows,
      revenue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
      repeatClients,
      topServices,
    }
  }

  async getClients(user: User) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const bookings = await this.db.booking.findMany({
      where: { providerId, providerType },
      orderBy: { date: 'desc' },
      select: {
        id: true, clientName: true, clientEmail: true, clientPhone: true,
        clientUserId: true, date: true, startTime: true, status: true, price: true,
        service: { select: { name: true } },
      },
    })

    const clientMap: Record<string, {
      clientName: string; clientEmail: string; clientPhone: string | null; clientUserId: string | null;
      totalBookings: number; totalSpent: number; completedBookings: number;
      cancelledBookings: number; noShowBookings: number; lastVisit: string | null;
      favoriteService: string | null;
    }> = {}

    for (const b of bookings as {
      clientName: string; clientEmail: string; clientPhone: string | null; clientUserId: string | null;
      date: string; status: string; price: number; service: { name: string } | null
    }[]) {
      if (!clientMap[b.clientEmail]) {
        clientMap[b.clientEmail] = {
          clientName: b.clientName, clientEmail: b.clientEmail,
          clientPhone: b.clientPhone, clientUserId: b.clientUserId,
          totalBookings: 0, totalSpent: 0, completedBookings: 0,
          cancelledBookings: 0, noShowBookings: 0, lastVisit: null, favoriteService: null,
        }
      }
      const c = clientMap[b.clientEmail]!
      c.totalBookings++
      if (b.status === 'COMPLETED') { c.completedBookings++; c.totalSpent += b.price; if (!c.lastVisit || b.date > c.lastVisit) c.lastVisit = b.date }
      if (b.status === 'CANCELLED') c.cancelledBookings++
      if (b.status === 'NO_SHOW')   c.noShowBookings++
    }

    return Object.values(clientMap).sort((a, b) => (b.lastVisit ?? '').localeCompare(a.lastVisit ?? ''))
  }

  async getClientHistory(user: User, clientEmail: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    return this.db.booking.findMany({
      where: { providerId, providerType, clientEmail },
      include: { service: { select: { id: true, name: true, category: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    })
  }

  private async resolveProviderUserId(providerId: string, providerType: string): Promise<string | null> {
    if (providerType === 'salon') {
      const salon = await this.prisma.salonProfile.findUnique({ where: { id: providerId }, select: { userId: true } })
      return salon?.userId ?? null
    }
    const worker = await this.prisma.workerProfile.findUnique({ where: { id: providerId }, select: { userId: true } })
    return worker?.userId ?? null
  }
}
