/**
 * React hooks for SalonIn native booking engine.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import {
  servicesApi,
  availabilityApi,
  exceptionsApi,
  bookingsApi,
  paymentsApi,
  stripeConnectApi,
} from './booking.api'
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
  StripeConnectStatus,
} from './booking.types'

// ─── Provider profile ID helper ───────────────────────────────────────────────

export function useMyProviderId(): { providerId: string | null; providerType: string } {
  const user = useAuthStore((s) => s.user)
  const providerId = (user as Record<string, unknown> | null)?.['profileId'] as string | null ?? null
  const providerType = user?.role === 'SALON' ? 'salon' : 'professional'
  return { providerId, providerType }
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function useProviderServices(providerId: string | null, providerType: string) {
  const [services, setServices] = useState<ProviderService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!providerId) return
    setIsLoading(true); setError(null)
    try {
      setServices(await servicesApi.list(providerId, providerType))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load services')
    } finally { setIsLoading(false) }
  }, [providerId, providerType])

  useEffect(() => { void load() }, [load])
  return { services, isLoading, error, refetch: load }
}

export function useServiceActions() {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (payload: CreateServicePayload): Promise<ProviderService | null> => {
    setIsWorking(true); setError(null)
    try { return await servicesApi.create(payload) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); return null }
    finally { setIsWorking(false) }
  }, [])

  const update = useCallback(async (id: string, payload: UpdateServicePayload): Promise<boolean> => {
    setIsWorking(true); setError(null)
    try { await servicesApi.update(id, payload); return true }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); return false }
    finally { setIsWorking(false) }
  }, [])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsWorking(true); setError(null)
    try { await servicesApi.remove(id); return true }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); return false }
    finally { setIsWorking(false) }
  }, [])

  return { create, update, remove, isWorking, error }
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function useAvailabilityHours(providerId: string | null, providerType: string) {
  const [rules, setRules] = useState<DayAvailabilityRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!providerId) return
    let cancelled = false
    setIsLoading(true)
    availabilityApi.getHours(providerId, providerType)
      .then((data) => { if (!cancelled) setRules(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [providerId, providerType])

  const save = useCallback(async (payload: DayAvailabilityRule[]): Promise<boolean> => {
    setIsSaving(true); setError(null)
    try { setRules(await availabilityApi.setHours(payload)); return true }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save'); return false }
    finally { setIsSaving(false) }
  }, [])

  return { rules, isLoading, isSaving, error, save }
}

export function useAvailabilitySlots(
  providerId: string | null,
  providerType: string,
  date: string | null,
  duration?: number,
) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!providerId || !date) return
    let cancelled = false
    setIsLoading(true)
    availabilityApi.getSlots(providerId, providerType, date, duration)
      .then((data) => { if (!cancelled) setSlots(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [providerId, providerType, date, duration])

  return { slots, isLoading }
}

export function useAvailabilityExceptions(providerId: string | null, providerType: string, from?: string, to?: string) {
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!providerId) return
    setIsLoading(true)
    exceptionsApi.list(providerId, providerType, from, to)
      .then(setExceptions)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [providerId, providerType, from, to])

  useEffect(() => { void load() }, [load])

  const add = useCallback(async (payload: CreateExceptionPayload): Promise<boolean> => {
    try { await exceptionsApi.create(payload); await load(); return true }
    catch { return false }
  }, [load])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try { await exceptionsApi.remove(id); await load(); return true }
    catch { return false }
  }, [load])

  return { exceptions, isLoading, refetch: load, add, remove }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

// ─── Provider Bookings (with filters) ────────────────────────────────────────

export function useProviderBookings(opts: {
  status?: string
  dateFilter?: 'today' | 'tomorrow' | 'week' | 'month'
  serviceId?: string
  search?: string
} = {}) {
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setBookings(await bookingsApi.getProviderBookingsFiltered(opts)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setIsLoading(false) }
  }, [opts.status, opts.dateFilter, opts.serviceId, opts.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])
  return { bookings, isLoading, error, refetch: load }
}

export function useBookingActions() {
  const [isWorking, setIsWorking] = useState(false)

  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setIsWorking(true)
    try { await fn(); return true }
    catch { return false }
    finally { setIsWorking(false) }
  }, [])

  const confirm    = useCallback((id: string) => run(() => bookingsApi.confirm(id)), [run])
  const cancel     = useCallback((id: string, reason?: string) => run(() => bookingsApi.cancelByProvider(id, reason)), [run])
  const reschedule = useCallback((id: string, date: string, time: string) => run(() => bookingsApi.rescheduleByProvider(id, date, time)), [run])
  const complete   = useCallback((id: string) => run(() => bookingsApi.complete(id)), [run])
  const noShow     = useCallback((id: string) => run(() => bookingsApi.noShow(id)), [run])

  return { isWorking, confirm, cancel, reschedule, complete, noShow }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useBookingAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d') {
  const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setAnalytics(await bookingsApi.getAnalytics(period)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setIsLoading(false) }
  }, [period])

  useEffect(() => { void load() }, [load])
  return { analytics, isLoading, error, refetch: load }
}

// ─── Client CRM ───────────────────────────────────────────────────────────────

export function useClientList() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setClients(await bookingsApi.getClients()) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  return { clients, isLoading, error, refetch: load }
}

export function useClientHistory(clientEmail: string | null) {
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!clientEmail) return
    let cancelled = false
    setIsLoading(true)
    bookingsApi.getClientHistory(clientEmail)
      .then((data) => { if (!cancelled) setBookings(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [clientEmail])

  return { bookings, isLoading }
}

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setBookings(await bookingsApi.getMyBookings()) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load bookings') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  return { bookings, isLoading, error, refetch: load }
}

export function useCreateBooking() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBooking = useCallback(async (payload: CreateBookingPayload): Promise<BookingResult | null> => {
    setIsSubmitting(true); setError(null)
    try { return await bookingsApi.create(payload) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Booking failed'); return null }
    finally { setIsSubmitting(false) }
  }, [])

  return { createBooking, isSubmitting, error }
}

export function useBookingPayment() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createIntent = useCallback(async (bookingId: string) => {
    setIsProcessing(true); setError(null)
    try { return await paymentsApi.createIntent(bookingId) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Payment failed'); return null }
    finally { setIsProcessing(false) }
  }, [])

  return { createIntent, isProcessing, error }
}

// ─── Stripe Connect ───────────────────────────────────────────────────────────

export function useStripeConnect() {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    stripeConnectApi.getStatus()
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const startOnboarding = useCallback(async (): Promise<string | null> => {
    try {
      const { onboardingUrl } = await stripeConnectApi.startOnboarding()
      return onboardingUrl
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding')
      return null
    }
  }, [])

  return { status, isLoading, error, startOnboarding }
}
