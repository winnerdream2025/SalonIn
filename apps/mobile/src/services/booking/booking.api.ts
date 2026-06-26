/**
 * SalonIn native booking engine API.
 * Uses the SalonIn backend directly — no more third-party Havanabook dependency.
 * All authenticated calls use the SalonIn JWT via the shared axios `api` client.
 */
import { api } from '@salonin/api-client'
import type {
  ProviderService,
  CreateServicePayload,
  UpdateServicePayload,
  DayAvailabilityRule,
  AvailabilitySlot,
  AvailabilityException,
  CreateExceptionPayload,
  CreateBookingPayload,
  BookingResult,
  BookingAnalytics,
  ClientSummary,
  PaymentIntent,
  StripeConnectStatus,
  IntakeForm,
  WaitlistEntry,
} from './booking.types'

// ─── Helper ───────────────────────────────────────────────────────────────────

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

// ─── Services ─────────────────────────────────────────────────────────────────

export const servicesApi = {
  list: (providerId: string, providerType: string): Promise<ProviderService[]> =>
    api.get('/services', { params: { providerId, providerType } }).then(unwrap<ProviderService[]>),

  create: (payload: CreateServicePayload): Promise<ProviderService> =>
    api.post('/services', payload).then(unwrap<ProviderService>),

  update: (id: string, payload: UpdateServicePayload): Promise<ProviderService> =>
    api.patch(`/services/${id}`, payload).then(unwrap<ProviderService>),

  remove: (id: string): Promise<void> =>
    api.delete(`/services/${id}`).then(() => undefined),
}

// ─── Availability ─────────────────────────────────────────────────────────────

export const availabilityApi = {
  getHours: (providerId: string, providerType: string): Promise<DayAvailabilityRule[]> =>
    api.get('/availability/hours', { params: { providerId, providerType } }).then(unwrap<DayAvailabilityRule[]>),

  setHours: (rules: DayAvailabilityRule[]): Promise<DayAvailabilityRule[]> =>
    api.put('/availability/hours', { rules }).then(unwrap<DayAvailabilityRule[]>),

  getSlots: (providerId: string, providerType: string, date: string, duration?: number): Promise<AvailabilitySlot[]> =>
    api.get('/availability/slots', { params: { providerId, providerType, date, ...(duration ? { duration } : {}) } })
      .then(unwrap<AvailabilitySlot[]>),

  getCalendar: (providerId: string, providerType: string, year: number, month: number): Promise<Record<string, boolean>> =>
    api.get('/availability/calendar', { params: { providerId, providerType, year, month } })
      .then(unwrap<Record<string, boolean>>),
}

export const exceptionsApi = {
  list: (providerId: string, providerType: string, from?: string, to?: string): Promise<AvailabilityException[]> =>
    api.get('/availability/exceptions', { params: { providerId, providerType, from, to } })
      .then(unwrap<AvailabilityException[]>),

  create: (payload: CreateExceptionPayload): Promise<AvailabilityException> =>
    api.post('/availability/exceptions', payload).then(unwrap<AvailabilityException>),

  remove: (id: string): Promise<void> =>
    api.delete(`/availability/exceptions/${id}`).then(() => undefined),
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  create: (payload: CreateBookingPayload): Promise<BookingResult> =>
    api.post('/bookings', payload).then(unwrap<BookingResult>),

  getMyBookings: (): Promise<BookingResult[]> =>
    api.get('/bookings/my').then(unwrap<BookingResult[]>),

  getProviderBookings: (status?: string): Promise<BookingResult[]> =>
    api.get('/bookings/provider', { params: status ? { status } : {} }).then(unwrap<BookingResult[]>),

  confirm: (bookingId: string): Promise<BookingResult> =>
    api.patch(`/bookings/${bookingId}/confirm`).then(unwrap<BookingResult>),

  cancelByProvider: (bookingId: string, reason?: string): Promise<BookingResult> =>
    api.patch(`/bookings/${bookingId}/cancel`, { reason }).then(unwrap<BookingResult>),

  clientCancel: (bookingId: string, cancelToken: string): Promise<BookingResult> =>
    api.post('/bookings/cancel', { bookingId, cancelToken }).then(unwrap<BookingResult>),

  clientReschedule: (
    bookingId: string,
    token: string,
    tokenType: 'rescheduleToken' | 'cancelToken',
    date: string,
    startTime: string,
  ): Promise<BookingResult> =>
    api.post('/bookings/reschedule', {
      bookingId,
      [tokenType]: token,
      date,
      startTime,
    }).then(unwrap<BookingResult>),

  rescheduleByProvider: (bookingId: string, date: string, startTime: string): Promise<BookingResult> =>
    api.patch(`/bookings/${bookingId}/reschedule`, { date, startTime }).then(unwrap<BookingResult>),

  complete: (bookingId: string): Promise<BookingResult> =>
    api.patch(`/bookings/${bookingId}/complete`).then(unwrap<BookingResult>),

  noShow: (bookingId: string): Promise<BookingResult> =>
    api.patch(`/bookings/${bookingId}/no-show`).then(unwrap<BookingResult>),

  getProviderBookingsFiltered: (params: {
    status?: string
    dateFilter?: 'today' | 'tomorrow' | 'week' | 'month'
    dateFrom?: string
    dateTo?: string
    serviceId?: string
    search?: string
  }): Promise<BookingResult[]> =>
    api.get('/bookings/provider/filtered', { params }).then(unwrap<BookingResult[]>),

  getAnalytics: (period?: '7d' | '30d' | '90d' | '1y'): Promise<BookingAnalytics> =>
    api.get('/bookings/analytics', { params: period ? { period } : {} }).then(unwrap<BookingAnalytics>),

  getClients: (): Promise<ClientSummary[]> =>
    api.get('/bookings/clients').then(unwrap<ClientSummary[]>),

  getClientHistory: (clientEmail: string): Promise<BookingResult[]> =>
    api.get(`/bookings/clients/${encodeURIComponent(clientEmail)}`).then(unwrap<BookingResult[]>),

  rebook: (bookingId: string, date: string, startTime: string): Promise<BookingResult> =>
    api.post('/bookings/rebook', { bookingId, date, startTime }).then(unwrap<BookingResult>),

  joinWaitlist: (payload: {
    providerId: string
    providerType: string
    serviceId: string
    date: string
    startTime: string
    clientName: string
    clientEmail: string
    clientPhone?: string
  }): Promise<{ id: string }> =>
    api.post('/bookings/waitlist', payload).then(unwrap<{ id: string }>),

  getWaitlist: (): Promise<WaitlistEntry[]> =>
    api.get('/bookings/waitlist').then(unwrap<WaitlistEntry[]>),

  removeFromWaitlist: (id: string): Promise<void> =>
    api.delete(`/bookings/waitlist/${id}`).then(() => undefined),
}

// ─── Intake Forms ─────────────────────────────────────────────────────────────

export const intakeFormsApi = {
  forProvider: (providerId: string, providerType: string): Promise<IntakeForm[]> =>
    api.get('/intake-forms/for-provider', { params: { providerId, providerType } })
      .then(unwrap<IntakeForm[]>),
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  createIntent: (bookingId: string): Promise<PaymentIntent> =>
    api.post('/payments/intent', { bookingId }).then(unwrap<PaymentIntent>),
}

// ─── Stripe Connect ───────────────────────────────────────────────────────────

export const stripeConnectApi = {
  getStatus: (): Promise<StripeConnectStatus> =>
    api.get('/stripe-connect/status').then(unwrap<StripeConnectStatus>),

  startOnboarding: (returnUrl?: string): Promise<{ onboardingUrl: string }> =>
    api.post('/stripe-connect/onboard', { returnUrl }).then(unwrap<{ onboardingUrl: string }>),
}
