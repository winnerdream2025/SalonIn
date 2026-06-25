/**
 * React hooks for the external booking flow.
 * Pattern: useState + useEffect (matches existing hooks in this app).
 */
import { useState, useEffect, useCallback } from 'react'
import { resolveTenantSlug, resolveProviderProfile } from './booking.mapper'
import { externalBookingApi } from './booking.api'
import type { BookingProviderType } from '@salonin/types'
import type {
  BookingService,
  BookingAvailabilitySlot,
  CreateBookingPayload,
  BookingResult,
  PaymentPayload,
  PaymentResult,
  ProviderBookingStatus,
  ProviderBookingItem,
  HavanaService,
  CreateServicePayload,
  UpdateServicePayload,
  AvailabilityHours,
} from './booking.types'

// ─── Tenant slug resolver ─────────────────────────────────────────────────────

export function useTenantSlug(
  providerId: string | undefined,
  providerType: BookingProviderType,
) {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!providerId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    resolveTenantSlug(providerId, providerType)
      .then((slug) => {
        if (cancelled) return
        setTenantSlug(slug)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to resolve booking profile')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [providerId, providerType])

  return { tenantSlug, isLoading, error }
}

export function useProviderProfile(
  providerId: string | undefined,
  providerType: BookingProviderType,
) {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [providerEmail, setProviderEmail] = useState<string | null>(null)
  const [providerPassword, setProviderPassword] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!providerId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    resolveProviderProfile(providerId, providerType)
      .then((p) => {
        if (cancelled) return
        setTenantSlug(p?.tenantSlug ?? null)
        setProviderEmail(p?.providerEmail ?? null)
        setProviderPassword(p?.providerPassword ?? null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to resolve booking profile')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [providerId, providerType])

  return { tenantSlug, providerEmail, providerPassword, isLoading, error }
}

// ─── Services list ────────────────────────────────────────────────────────────

export function useBookingServices(tenantSlug: string | null) {
  const [services, setServices] = useState<BookingService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    if (!tenantSlug) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    externalBookingApi
      .getServices(tenantSlug)
      .then((data) => { if (!cancelled) setServices(data) })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Could not load services')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [tenantSlug])

  useEffect(() => {
    const cleanup = fetch()
    return cleanup
  }, [fetch])

  return { services, isLoading, error, refetch: fetch }
}

// ─── Availability slots ───────────────────────────────────────────────────────

export function useBookingAvailability(
  tenantSlug: string | null,
  serviceId: string | null,
  date?: string,
) {
  const [slots, setSlots] = useState<BookingAvailabilitySlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantSlug || !serviceId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    externalBookingApi
      .getAvailability(tenantSlug, serviceId, date)
      .then((data) => { if (!cancelled) setSlots(data) })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Could not load availability')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [tenantSlug, serviceId, date])

  return { slots, isLoading, error }
}

// ─── Create booking ───────────────────────────────────────────────────────────

export function useCreateBooking(tenantSlug: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBooking = useCallback(
    async (payload: CreateBookingPayload): Promise<BookingResult | null> => {
      if (!tenantSlug) {
        setError('No booking profile available')
        return null
      }
      setIsSubmitting(true)
      setError(null)
      try {
        const result = await externalBookingApi.createBooking(tenantSlug, payload)
        return result
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Booking failed')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [tenantSlug],
  )

  return { createBooking, isSubmitting, error }
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export function useBookingPayment(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processPayment = useCallback(
    async (payload: PaymentPayload): Promise<PaymentResult | null> => {
      if (!tenantSlug) {
        setError('No booking profile available')
        return null
      }
      setIsProcessing(true)
      setError(null)
      try {
        const result = await externalBookingApi.processPayment(
          tenantSlug,
          providerEmail,
          providerPassword,
          payload,
        )
        return result
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Payment failed')
        return null
      } finally {
        setIsProcessing(false)
      }
    },
    [tenantSlug, providerEmail, providerPassword],
  )

  return { processPayment, isProcessing, error }
}

// ─── Provider: list bookings ────────────────────────────────────────────────

export function useProviderBookings(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
  status?: ProviderBookingStatus,
) {
  const [bookings, setBookings] = useState<ProviderBookingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!tenantSlug || !providerEmail || !providerPassword) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    externalBookingApi
      .getProviderBookings(tenantSlug, providerEmail, providerPassword, status)
      .then((data) => { if (!cancelled) setBookings(data) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load bookings')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [tenantSlug, providerEmail, providerPassword, status])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  return { bookings, isLoading, error, refetch: load }
}

// ─── Provider: booking actions ────────────────────────────────────────────────

export function useProviderBookingActions(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = useCallback(
    async (bookingId: string): Promise<ProviderBookingItem | null> => {
      if (!tenantSlug || !providerEmail || !providerPassword) return null
      setIsWorking(true)
      setError(null)
      try {
        return await externalBookingApi.confirmBooking(tenantSlug, providerEmail, providerPassword, bookingId)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to confirm booking')
        return null
      } finally {
        setIsWorking(false)
      }
    },
    [tenantSlug, providerEmail, providerPassword],
  )

  const cancel = useCallback(
    async (bookingId: string, reason?: string): Promise<ProviderBookingItem | null> => {
      if (!tenantSlug || !providerEmail || !providerPassword) return null
      setIsWorking(true)
      setError(null)
      try {
        return await externalBookingApi.cancelBooking(tenantSlug, providerEmail, providerPassword, bookingId, reason)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to cancel booking')
        return null
      } finally {
        setIsWorking(false)
      }
    },
    [tenantSlug, providerEmail, providerPassword],
  )

  const reschedule = useCallback(
    async (
      bookingId: string,
      newDate: string,
      newStartTime: string,
    ): Promise<ProviderBookingItem | null> => {
      if (!tenantSlug || !providerEmail || !providerPassword) return null
      setIsWorking(true)
      setError(null)
      try {
        return await externalBookingApi.rescheduleBooking(tenantSlug, providerEmail, providerPassword, bookingId, newDate, newStartTime)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to reschedule booking')
        return null
      } finally {
        setIsWorking(false)
      }
    },
    [tenantSlug, providerEmail, providerPassword],
  )

  return { confirm, cancel, reschedule, isWorking, error }
}

// ─── Provider Services ────────────────────────────────────────────────────────

export function useProviderServices(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
) {
  const [services, setServices] = useState<HavanaService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantSlug || !providerEmail || !providerPassword) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await externalBookingApi.listServices(tenantSlug, providerEmail, providerPassword)
      setServices(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load services')
    } finally {
      setIsLoading(false)
    }
  }, [tenantSlug, providerEmail, providerPassword])

  useEffect(() => { load() }, [load])

  return { services, isLoading, error, refetch: load }
}

export function useServiceActions(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (payload: CreateServicePayload): Promise<HavanaService | null> => {
    if (!tenantSlug || !providerEmail || !providerPassword) return null
    setIsWorking(true); setError(null)
    try {
      return await externalBookingApi.createService(tenantSlug, providerEmail, providerPassword, payload)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create service')
      return null
    } finally { setIsWorking(false) }
  }, [tenantSlug, providerEmail, providerPassword])

  const update = useCallback(async (serviceId: number, payload: UpdateServicePayload): Promise<boolean> => {
    if (!tenantSlug || !providerEmail || !providerPassword) return false
    setIsWorking(true); setError(null)
    try {
      await externalBookingApi.updateService(tenantSlug, providerEmail, providerPassword, serviceId, payload)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update service')
      return false
    } finally { setIsWorking(false) }
  }, [tenantSlug, providerEmail, providerPassword])

  const remove = useCallback(async (serviceId: number): Promise<boolean> => {
    if (!tenantSlug || !providerEmail || !providerPassword) return false
    setIsWorking(true); setError(null)
    try {
      await externalBookingApi.deleteService(tenantSlug, providerEmail, providerPassword, serviceId)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete service')
      return false
    } finally { setIsWorking(false) }
  }, [tenantSlug, providerEmail, providerPassword])

  return { create, update, remove, isWorking, error }
}

// ─── Provider Availability Hours ─────────────────────────────────────────────

export function useAvailabilityHours(
  tenantSlug: string | null,
  providerEmail: string | null,
  providerPassword: string | null,
) {
  const [hours, setHours] = useState<AvailabilityHours | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantSlug || !providerEmail || !providerPassword) return
    let cancelled = false
    setIsLoading(true)
    externalBookingApi.getAvailabilityHours(tenantSlug, providerEmail, providerPassword)
      .then((data) => { if (!cancelled) setHours(data) })
      .catch(() => { if (!cancelled) setHours(null) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [tenantSlug, providerEmail, providerPassword])

  const save = useCallback(async (payload: AvailabilityHours): Promise<boolean> => {
    if (!tenantSlug || !providerEmail || !providerPassword) return false
    setIsSaving(true); setError(null)
    try {
      await externalBookingApi.setAvailabilityHours(tenantSlug, providerEmail, providerPassword, payload)
      setHours(payload)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save availability')
      return false
    } finally { setIsSaving(false) }
  }, [tenantSlug, providerEmail, providerPassword])

  return { hours, isLoading, isSaving, error, save }
}
