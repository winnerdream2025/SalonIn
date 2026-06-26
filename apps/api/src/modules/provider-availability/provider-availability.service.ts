import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { User } from '@salonin/types'

export interface AvailabilityExceptionDto {
  date: string
  startTime?: string
  endTime?: string
  isBlocked?: boolean
  reason?: string
}

export interface DayRule {
  dayOfWeek: number  // 0=Sun … 6=Sat
  isOpen: boolean
  openTime: string   // "09:00"
  closeTime: string  // "17:00"
}

export interface SlotResult {
  time: string        // "09:00"
  available: boolean
}

const SLOT_INTERVAL = 30 // minutes

function timeToMinutes(t: string): number {
  const [h = '0', m = '0'] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

@Injectable()
export class ProviderAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any { return this.prisma as any }

  private async resolveProviderId(user: User): Promise<{ providerId: string; providerType: string }> {
    if (user.role === 'SALON') {
      const salon = await this.prisma.salonProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      return { providerId: salon?.id ?? '', providerType: 'salon' }
    }
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
    return { providerId: worker?.id ?? '', providerType: 'professional' }
  }

  async getRules(providerId: string, providerType: string): Promise<DayRule[]> {
    const rows = await this.db.providerAvailabilityRule.findMany({
      where: { providerId, providerType },
      orderBy: { dayOfWeek: 'asc' },
    })
    return rows as DayRule[]
  }

  async setRules(user: User, rules: DayRule[]): Promise<DayRule[]> {
    const { providerId, providerType } = await this.resolveProviderId(user)

    await this.db.providerAvailabilityRule.deleteMany({ where: { providerId, providerType } })
    await this.db.providerAvailabilityRule.createMany({
      data: rules.map((r) => ({ providerId, providerType, ...r })),
    })
    return this.getRules(providerId, providerType)
  }

  async getSlots(providerId: string, providerType: string, date: string, duration = SLOT_INTERVAL): Promise<SlotResult[]> {
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getDay()
    const rule = await this.db.providerAvailabilityRule.findUnique({
      where: { providerId_providerType_dayOfWeek: { providerId, providerType, dayOfWeek } },
    }) as DayRule | null

    if (!rule || !rule.isOpen) return []

    // Check for full-day exception block
    const exceptions = await this.db.availabilityException.findMany({
      where: { providerId, providerType, date, isBlocked: true },
    }) as { startTime: string | null; endTime: string | null }[]

    const fullDayBlocked = exceptions.some((e) => !e.startTime && !e.endTime)
    if (fullDayBlocked) return []

    const openMins  = timeToMinutes(rule.openTime)
    const closeMins = timeToMinutes(rule.closeTime)

    // Fetch already-booked slots for that day (with buffer)
    const booked = await this.db.booking.findMany({
      where: {
        providerId,
        providerType,
        date,
        status: { in: ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED'] },
      },
      select: { startTime: true, endTime: true, serviceId: true },
    }) as { startTime: string; endTime: string; serviceId: string }[]

    // Resolve buffers per booking
    const serviceIds = [...new Set(booked.map((b) => b.serviceId))]
    const services = await this.db.providerService.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, bufferBefore: true, bufferAfter: true },
    }) as { id: string; bufferBefore: number; bufferAfter: number }[]
    const bufferMap = Object.fromEntries(services.map((s) => [s.id, s])) as Record<string, { bufferBefore: number; bufferAfter: number }>

    const bookedRanges = booked.map((b) => {
      const buf = bufferMap[b.serviceId] ?? { bufferBefore: 0, bufferAfter: 0 }
      return {
        start: timeToMinutes(b.startTime) - (buf.bufferBefore ?? 0),
        end:   timeToMinutes(b.endTime)   + (buf.bufferAfter  ?? 0),
      }
    })

    // Add partial-day exception blocks
    const partialBlocks = exceptions
      .filter((e) => e.startTime && e.endTime)
      .map((e) => ({ start: timeToMinutes(e.startTime!), end: timeToMinutes(e.endTime!) }))

    const allBlocked = [...bookedRanges, ...partialBlocks]

    const slots: SlotResult[] = []
    for (let t = openMins; t + duration <= closeMins; t += SLOT_INTERVAL) {
      const slotEnd = t + duration
      const blocked = allBlocked.some((r) => t < r.end && slotEnd > r.start)
      slots.push({ time: minutesToTime(t), available: !blocked })
    }
    return slots
  }

  async getExceptions(providerId: string, providerType: string, from?: string, to?: string) {
    return this.db.availabilityException.findMany({
      where: {
        providerId,
        providerType,
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { date: 'asc' },
    })
  }

  async addException(user: User, dto: AvailabilityExceptionDto) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    return this.db.availabilityException.create({
      data: { providerId, providerType, ...dto, isBlocked: dto.isBlocked ?? true },
    })
  }

  async deleteException(user: User, id: string) {
    const { providerId, providerType } = await this.resolveProviderId(user)
    const exc = await this.db.availabilityException.findUnique({ where: { id } })
    if (!exc) throw new NotFoundException('Exception not found')
    if (exc.providerId !== providerId || exc.providerType !== providerType) {
      throw new ForbiddenException('Not your exception')
    }
    await this.db.availabilityException.delete({ where: { id } })
  }

  async getCalendar(providerId: string, providerType: string, year: number, month: number): Promise<Record<string, boolean>> {
    const rules = await this.getRules(providerId, providerType)
    const openDays = new Set(rules.filter((r) => r.isOpen).map((r) => r.dayOfWeek))

    const daysInMonth = new Date(year, month, 0).getDate()
    const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`
    const monthTo   = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    // Pull full-day exception blocks so we can mark those dates closed
    const blockedExceptions = await this.db.availabilityException.findMany({
      where: { providerId, providerType, isBlocked: true, date: { gte: monthFrom, lte: monthTo } },
      select: { date: true, startTime: true },
    }) as { date: string; startTime: string | null }[]
    const fullyBlockedDates = new Set(
      blockedExceptions.filter((e) => !e.startTime).map((e) => e.date),
    )

    const result: Record<string, boolean> = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day)
      const dateStr = d.toISOString().slice(0, 10)
      result[dateStr] = openDays.has(d.getDay()) && !fullyBlockedDates.has(dateStr)
    }
    return result
  }
}
