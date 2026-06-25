/**
 * Calls the external multi-tenant booking platform API.
 * All public endpoints require an `x-tenant-slug` header to identify the tenant.
 *
 * Base URL is read from EXPO_PUBLIC_BOOKING_API_URL env var.
 */
import type {
  BookingService,
  BookingAvailabilitySlot,
  CreateBookingPayload,
  BookingResult,
  PaymentPayload,
  PaymentResult,
  BookingTenant,
  ProviderBookingStatus,
  ProviderBookingItem,
  HavanaService,
  CreateServicePayload,
  UpdateServicePayload,
  AvailabilityHours,
} from './booking.types'

function getBaseUrl(): string {
  const url = (process.env as Record<string, string | undefined>)['EXPO_PUBLIC_BOOKING_API_URL']
  return url ?? 'https://backendllc-production.up.railway.app'
}

// ─── Provider JWT cache (per tenantSlug) ─────────────────────────────────────

const providerTokenCache = new Map<string, { token: string; expiresAt: number }>()

async function providerLogin(tenantSlug: string, email: string, password: string): Promise<string> {
  const cached = providerTokenCache.get(tenantSlug)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const res = await fetch(`${getBaseUrl()}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug },
    body: JSON.stringify({ email, password, tenantSlug }),
  })

  if (!res.ok) throw new Error(`Provider login failed (${res.status})`)

  const body = (await res.json()) as { token: string }
  const token = body.token
  // Cache for 55 minutes (JWT typically expires in 1h)
  providerTokenCache.set(tenantSlug, { token, expiresAt: Date.now() + 55 * 60 * 1000 })
  return token
}

/** Provider-side fetch — requires Bearer JWT from Havanabook login */
async function providerFetch<T>(
  path: string,
  tenantSlug: string,
  email: string,
  password: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await providerLogin(tenantSlug, email, password)
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': tenantSlug,
      'Authorization': `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    // Token expired — clear cache and retry once
    providerTokenCache.delete(tenantSlug)
    const freshToken = await providerLogin(tenantSlug, email, password)
    const retry = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantSlug,
        'Authorization': `Bearer ${freshToken}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    })
    if (!retry.ok) {
      let msg = `Provider API error ${retry.status}`
      try { const b = (await retry.json()) as { message?: string }; msg = b.message ?? msg } catch { /* ignore */ }
      throw new Error(msg)
    }
    return retry.json() as Promise<T>
  }

  if (!res.ok) {
    let msg = `Provider API error ${res.status}`
    try { const b = (await res.json()) as { message?: string }; msg = b.message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  return res.json() as Promise<T>
}

async function externalFetch<T>(
  path: string,
  tenantSlug: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': tenantSlug,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    let message = `Booking API error ${res.status}`
    try {
      const body = (await res.json()) as { message?: string; error?: string }
      message = body.message ?? body.error ?? message
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const externalBookingApi = {
  /** Fetch public tenant info for display. */
  getTenant: (tenantSlug: string): Promise<BookingTenant> =>
    externalFetch<BookingTenant>('/api/public/tenant', tenantSlug),

  /** List bookable services offered by the tenant. */
  getServices: (tenantSlug: string): Promise<BookingService[]> =>
    externalFetch<BookingService[]>('/api/public/services', tenantSlug),

  /**
   * Fetch available time slots.
   * @param tenantSlug  Tenant identifier
   * @param serviceId   Service to check availability for
   * @param date        ISO date string YYYY-MM-DD (optional — returns full week if omitted)
   */
  getAvailability: (
    tenantSlug: string,
    serviceId: string,
    date?: string,
  ): Promise<BookingAvailabilitySlot[]> => {
    const qs = new URLSearchParams({ serviceId })
    if (date) qs.set('date', date)
    return externalFetch<BookingAvailabilitySlot[]>(
      `/api/public/availability?${qs.toString()}`,
      tenantSlug,
    )
  },

  /** Create a booking. Returns the created booking with status. */
  createBooking: (
    tenantSlug: string,
    payload: CreateBookingPayload,
  ): Promise<BookingResult> =>
    externalFetch<BookingResult>('/api/public/bookings', tenantSlug, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Process a payment for a booking. Requires provider JWT (Bearer token). */
  processPayment: (
    tenantSlug: string,
    providerEmail: string | null,
    providerPassword: string | null,
    payload: PaymentPayload,
  ): Promise<PaymentResult> =>
    providerFetch<PaymentResult>('/api/mobile/payment', tenantSlug, providerEmail ?? '', providerPassword ?? '', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Provider-side endpoints (require JWT auth) ───────────────────────────

  /**
   * List bookings for this provider.
   * email/password are the provider's Havanabook credentials (stored in ProviderBookingProfile).
   */
  getProviderBookings: (
    tenantSlug: string,
    email: string,
    password: string,
    status?: ProviderBookingStatus,
  ): Promise<ProviderBookingItem[]> => {
    const qs = status ? `?status=${status}` : ''
    return providerFetch<ProviderBookingItem[]>(`/api/mobile/provider/bookings${qs}`, tenantSlug, email, password)
  },

  /** Confirm a pending booking. */
  confirmBooking: (
    tenantSlug: string,
    email: string,
    password: string,
    bookingId: string,
  ): Promise<ProviderBookingItem> =>
    providerFetch<ProviderBookingItem>(`/api/mobile/provider/bookings/${bookingId}/confirm`, tenantSlug, email, password, {
      method: 'POST',
    }),

  /** Cancel a booking with an optional reason. */
  cancelBooking: (
    tenantSlug: string,
    email: string,
    password: string,
    bookingId: string,
    reason?: string,
  ): Promise<ProviderBookingItem> =>
    providerFetch<ProviderBookingItem>(`/api/mobile/provider/bookings/${bookingId}/cancel`, tenantSlug, email, password, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Reschedule a booking to a new date/time. */
  rescheduleBooking: (
    tenantSlug: string,
    email: string,
    password: string,
    bookingId: string,
    newDate: string,
    newStartTime: string,
  ): Promise<ProviderBookingItem> =>
    providerFetch<ProviderBookingItem>(`/api/mobile/provider/bookings/${bookingId}/reschedule`, tenantSlug, email, password, {
      method: 'POST',
      body: JSON.stringify({ date: newDate, startTime: newStartTime }),
    }),

  // ── Provider Services Management ─────────────────────────────────────────

  /** List all services for this tenant (provider view). */
  listServices: (
    tenantSlug: string,
    email: string,
    password: string,
  ): Promise<HavanaService[]> =>
    providerFetch<HavanaService[]>('/api/mobile/services', tenantSlug, email, password),

  /** Create a new service. */
  createService: (
    tenantSlug: string,
    email: string,
    password: string,
    payload: CreateServicePayload,
  ): Promise<HavanaService> =>
    providerFetch<HavanaService>('/api/mobile/services', tenantSlug, email, password, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Update an existing service by numeric id. */
  updateService: (
    tenantSlug: string,
    email: string,
    password: string,
    serviceId: number,
    payload: UpdateServicePayload,
  ): Promise<{ success: boolean }> =>
    providerFetch<{ success: boolean }>(`/api/mobile/services/${serviceId}`, tenantSlug, email, password, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** Delete a service. */
  deleteService: (
    tenantSlug: string,
    email: string,
    password: string,
    serviceId: number,
  ): Promise<{ success: boolean }> =>
    providerFetch<{ success: boolean }>(`/api/mobile/services/${serviceId}`, tenantSlug, email, password, {
      method: 'DELETE',
    }),

  // ── Provider Availability Hours ───────────────────────────────────────────

  /** Get provider working hours from Havanabook. */
  getAvailabilityHours: (
    tenantSlug: string,
    email: string,
    password: string,
  ): Promise<AvailabilityHours> =>
    providerFetch<AvailabilityHours>('/api/mobile/provider/availability', tenantSlug, email, password),

  /** Set provider working hours in Havanabook. */
  setAvailabilityHours: (
    tenantSlug: string,
    email: string,
    password: string,
    payload: AvailabilityHours,
  ): Promise<{ success: boolean }> =>
    providerFetch<{ success: boolean }>('/api/mobile/provider/availability', tenantSlug, email, password, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Stripe Connect ────────────────────────────────────────────────────────

  /** Get the Stripe Connect onboarding URL for this tenant. */
  getStripeConnectUrl: (
    tenantSlug: string,
    email: string,
    password: string,
  ): Promise<{ url: string }> =>
    providerFetch<{ url: string }>('/api/mobile/provider/stripe/connect', tenantSlug, email, password),

  // ── Client self-serve cancel / reschedule ─────────────────────────────────

  /** Client cancels their own booking using the cancelToken from booking creation. */
  clientCancelBooking: (
    tenantSlug: string,
    cancelToken: string,
  ): Promise<{ success: boolean }> =>
    externalFetch<{ success: boolean }>('/api/public/bookings/cancel', tenantSlug, {
      method: 'POST',
      body: JSON.stringify({ cancelToken }),
    }),

  /** Client reschedules their own booking using the cancelToken. */
  clientRescheduleBooking: (
    tenantSlug: string,
    cancelToken: string,
    newDate: string,
    newStartTime: string,
  ): Promise<{ success: boolean }> =>
    externalFetch<{ success: boolean }>('/api/public/bookings/reschedule', tenantSlug, {
      method: 'POST',
      body: JSON.stringify({ cancelToken, newDate, newStartTime }),
    }),
}
