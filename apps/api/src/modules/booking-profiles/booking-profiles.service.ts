import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateBookingProfileDto } from './dto/create-booking-profile.dto'
import type { UpdateBookingProfileDto } from './dto/update-booking-profile.dto'
import type { BookingProviderType, ProviderBookingProfile } from '@salonin/types'

// ─── Raw shape (mirrors the Prisma schema until `prisma generate` is run) ────

interface RawBookingProfile {
  id: string
  providerId: string
  providerType: string
  tenantSlug: string
  externalBookingSystemId: string | null
  isActive: boolean
  providerEmail: string | null
  providerPassword: string | null
  createdAt: Date
  updatedAt: Date
}

interface ActiveProfileRow {
  tenantSlug: string
  providerType: string
  providerId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapProfile(raw: RawBookingProfile): ProviderBookingProfile {
  return {
    id: raw.id,
    providerId: raw.providerId,
    providerType: raw.providerType as BookingProviderType,
    tenantSlug: raw.tenantSlug,
    externalBookingSystemId: raw.externalBookingSystemId,
    isActive: raw.isActive,
    providerEmail: raw.providerEmail,
    providerPassword: raw.providerPassword,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class BookingProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Typed accessor for `providerBookingProfile` until `prisma generate` is run
   * after the migration adds the model.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get bpp(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any).providerBookingProfile
  }

  // ─── Havanabook integration helpers ────────────────────────────────────────

  private get havanaBaseUrl(): string {
    return process.env.BOOKING_API_URL ?? 'https://backendllc-production.up.railway.app'
  }

  private get havanaIntegrationKey(): string {
    return process.env.HAVANA_INTEGRATION_KEY ?? process.env.HAVANA_WEBHOOK_SECRET ?? ''
  }

  /** Fetch Havanabook platform config (Stripe key etc.) */
  async getHavanaConfig(): Promise<{ stripePublishableKey: string }> {
    const res = await fetch(`${this.havanaBaseUrl}/api/integrations/config`, {
      headers: { 'x-integration-key': this.havanaIntegrationKey },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) throw new Error(`Havanabook config fetch failed (${res.status})`)
    return res.json() as Promise<{ stripePublishableKey: string }>
  }

  /**
   * Create a Havanabook tenant for a provider, then upsert the ProviderBookingProfile.
   * If a profile already exists and is active, returns it without calling Havanabook again.
   */
  async autoSetupTenant(
    providerId: string,
    providerType: BookingProviderType,
    businessName: string,
    email: string,
    phone?: string,
  ): Promise<ProviderBookingProfile> {
    const existing = (await this.bpp.findUnique({
      where: { providerId_providerType: { providerId, providerType } },
    })) as RawBookingProfile | null

    if (existing?.isActive) return mapProfile(existing)

    const res = await fetch(`${this.havanaBaseUrl}/api/integrations/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-key': this.havanaIntegrationKey,
      },
      body: JSON.stringify({ businessName, email, phone }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message ?? `Havanabook tenant creation failed (${res.status})`)
    }

    const tenant = (await res.json()) as {
      tenantSlug: string
      providerEmail: string
      providerPassword: string
    }

    if (existing) {
      const raw = (await this.bpp.update({
        where: { id: existing.id },
        data: {
          tenantSlug: tenant.tenantSlug,
          providerEmail: tenant.providerEmail,
          providerPassword: tenant.providerPassword,
          isActive: true,
        },
      })) as RawBookingProfile
      return mapProfile(raw)
    }

    const raw = (await this.bpp.create({
      data: {
        providerId,
        providerType,
        tenantSlug: tenant.tenantSlug,
        providerEmail: tenant.providerEmail,
        providerPassword: tenant.providerPassword,
        isActive: true,
      },
    })) as RawBookingProfile
    return mapProfile(raw)
  }

  async getByProvider(
    providerId: string,
    providerType: BookingProviderType,
  ): Promise<ProviderBookingProfile | null> {
    const raw = (await this.bpp.findUnique({
      where: { providerId_providerType: { providerId, providerType } },
    })) as RawBookingProfile | null
    return raw ? mapProfile(raw) : null
  }

  async create(dto: CreateBookingProfileDto): Promise<ProviderBookingProfile> {
    const existing = (await this.bpp.findUnique({
      where: {
        providerId_providerType: {
          providerId: dto.providerId,
          providerType: dto.providerType,
        },
      },
    })) as RawBookingProfile | null

    if (existing) {
      throw new ConflictException('A booking profile already exists for this provider.')
    }

    const raw = (await this.bpp.create({
      data: {
        providerId: dto.providerId,
        providerType: dto.providerType,
        tenantSlug: dto.tenantSlug,
        externalBookingSystemId: dto.externalBookingSystemId ?? null,
        isActive: dto.isActive ?? true,
        providerEmail: dto.providerEmail ?? null,
        providerPassword: dto.providerPassword ?? null,
      },
    })) as RawBookingProfile
    return mapProfile(raw)
  }

  async update(id: string, dto: UpdateBookingProfileDto): Promise<ProviderBookingProfile> {
    const existing = (await this.bpp.findUnique({ where: { id } })) as RawBookingProfile | null
    if (!existing) {
      throw new NotFoundException('Booking profile not found.')
    }

    const raw = (await this.bpp.update({
      where: { id },
      data: {
        ...(dto.tenantSlug !== undefined && { tenantSlug: dto.tenantSlug }),
        ...(dto.externalBookingSystemId !== undefined && {
          externalBookingSystemId: dto.externalBookingSystemId,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.providerEmail !== undefined && { providerEmail: dto.providerEmail }),
        ...(dto.providerPassword !== undefined && { providerPassword: dto.providerPassword }),
      },
    })) as RawBookingProfile
    return mapProfile(raw)
  }

  /** Used by the webhook handler to resolve providerId from tenantSlug */
  async getByTenantSlug(tenantSlug: string): Promise<ProviderBookingProfile | null> {
    const raw = (await this.bpp.findFirst({
      where: { tenantSlug, isActive: true },
    })) as RawBookingProfile | null
    return raw ? mapProfile(raw) : null
  }

  /**
   * Fetch this client's bookings across ALL active Havana tenants.
   * Queries each tenant in parallel via the external Havana API.
   */
  async getMyBookings(clientEmail: string): Promise<ClientBookingItem[]> {
    const bookingApiUrl = process.env.BOOKING_API_URL ?? 'https://backendllc-production.up.railway.app'

    const activeProfiles = (await this.bpp.findMany({
      where: { isActive: true },
      select: { tenantSlug: true, providerType: true, providerId: true },
    })) as ActiveProfileRow[]

    const professionalIds = activeProfiles
      .filter((p: ActiveProfileRow) => p.providerType === 'professional')
      .map((p: ActiveProfileRow) => p.providerId)
    const salonIds = activeProfiles
      .filter((p: ActiveProfileRow) => p.providerType === 'salon')
      .map((p: ActiveProfileRow) => p.providerId)

    // Resolve display names for all providers in one shot
    const [workerNames, salonNames] = await Promise.all([
      this.prisma.workerProfile.findMany({
        where: { id: { in: professionalIds } },
        select: { id: true, name: true, photoUrl: true },
      }),
      this.prisma.salonProfile.findMany({
        where: { id: { in: salonIds } },
        select: { id: true, name: true, photoUrls: true },
      }),
    ])

    const workerMap = new Map(workerNames.map((w) => [w.id, { name: w.name, photoUrl: w.photoUrl ?? null }]))
    const salonMap  = new Map(salonNames.map((s) => [s.id, { name: s.name, photoUrl: s.photoUrls[0] ?? null }]))

    const results = await Promise.allSettled(
      activeProfiles.map(async (profile: ActiveProfileRow) => {
        const qs = new URLSearchParams({ clientEmail })
        const res = await fetch(`${bookingApiUrl}/api/public/bookings/client?${qs.toString()}`, {
          headers: { 'x-tenant-slug': profile.tenantSlug },
          signal: AbortSignal.timeout(8_000),
        })
        if (!res.ok) return [] as ClientBookingItem[]

        const bookings = (await res.json()) as ExternalBookingItem[]
        const info =
          profile.providerType === 'professional'
            ? (workerMap.get(profile.providerId) ?? { name: 'Unknown', photoUrl: null })
            : (salonMap.get(profile.providerId) ?? { name: 'Unknown', photoUrl: null })

        return bookings.map<ClientBookingItem>((b) => ({
          ...b,
          tenantSlug: profile.tenantSlug,
          providerType: profile.providerType as BookingProviderType,
          providerName: info.name,
          providerPhoto: info.photoUrl,
        }))
      }),
    )

    return results
      .filter((r): r is PromiseFulfilledResult<ClientBookingItem[]> => r.status === 'fulfilled')
      .flatMap((r: PromiseFulfilledResult<ClientBookingItem[]>) => r.value)
      .sort((a: ClientBookingItem, b: ClientBookingItem) => {
        const aDate = `${a.date}T${a.startTime}`
        const bDate = `${b.date}T${b.startTime}`
        if (a.status === 'pending_payment' || a.status === 'pending' || a.status === 'confirmed') {
          return aDate < bDate ? -1 : 1
        }
        return aDate > bDate ? -1 : 1
      })
  }
}

interface ExternalBookingItem {
  id: string
  status: 'pending_payment' | 'pending' | 'confirmed' | 'cancelled' | 'completed'
  serviceId: string
  serviceName: string
  date: string
  startTime: string
  endTime?: string
  price: number
  currency: string
  confirmationCode?: string | null
}

export interface ClientBookingItem extends ExternalBookingItem {
  tenantSlug: string
  providerType: BookingProviderType
  providerName: string
  providerPhoto: string | null
}
