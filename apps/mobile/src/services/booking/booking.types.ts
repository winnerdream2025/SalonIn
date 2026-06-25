// Normalized types for the external multi-tenant booking platform API.

export interface BookingService {
  id: string
  name: string
  description: string | null
  duration: number        // minutes
  price: number           // in currency unit (e.g. USD cents or dollars — match API)
  currency: string        // e.g. "USD"
  category?: string | null
}

export interface BookingAvailabilitySlot {
  date: string       // ISO date YYYY-MM-DD
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  available?: boolean // explicitly false = blocked; absent or true = bookable
  staffId?: string | null
  staffName?: string | null
}

export interface BookingData {
  name: string
  email: string
  phone?: string
  serviceId: string
  serviceName: string
  date: string       // YYYY-MM-DD
  timeSlot: string   // h:mm AM/PM
  price: number
  staffId?: string
  notes?: string
}

export interface CreateBookingPayload {
  bookingData: BookingData
  paymentIntentId?: string
  policyAccepted: boolean
}

export interface BookingResult {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  serviceId: string
  serviceName: string
  date: string
  startTime: string
  endTime: string
  price: number
  currency: string
  confirmationCode?: string | null
  cancelToken?: string | null
  rescheduleToken?: string | null
}

/** Havanabook service record returned by GET/POST /api/mobile/services */
export interface HavanaService {
  id: number
  serviceId: string
  name: string
  description: string | null
  category: string | null
  image: string | null
  duration: string         // minutes as string e.g. "60"
  pricingType: string      // "flat"
  flatPrice: number | null
  startingPrice: number | null
  isActive: boolean
  sortOrder: number
}

export interface CreateServicePayload {
  name: string
  description?: string
  duration: number         // minutes
  flatPrice?: number
  category?: string
}

export interface UpdateServicePayload {
  name?: string
  description?: string
  duration?: number
  flatPrice?: number
  category?: string
  isActive?: boolean
}

/** Provider working hours for Havanabook booking availability */
export interface DayHours {
  isOpen: boolean
  start: string   // "09:00"
  end: string     // "18:00"
}

export interface AvailabilityHours {
  monday:    DayHours
  tuesday:   DayHours
  wednesday: DayHours
  thursday:  DayHours
  friday:    DayHours
  saturday:  DayHours
  sunday:    DayHours
}

export interface PaymentPayload {
  bookingId?: string
}

export interface PaymentResult {
  success: boolean
  clientSecret?: string | null
  paymentIntentId?: string | null
  transactionId?: string | null
  amount?: number | null
  /** 'free' covers both zero-price bookings and NO_STRIPE (tenant has no Stripe account) */
  status: 'paid' | 'pending' | 'failed' | 'no_stripe' | 'free'
  /** Havanabook detail code e.g. 'NO_STRIPE' */
  code?: string | null
}

export interface BookingTenant {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
}

// ─── Provider-side types ──────────────────────────────────────────────────────

export type ProviderBookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no-show'
  | 'rescheduled'

export interface ProviderBookingItem {
  bookingId: string
  status: ProviderBookingStatus
  serviceId: string
  serviceName: string
  date: string          // YYYY-MM-DD
  startTime: string     // h:mm AM/PM
  endTime?: string      // h:mm AM/PM
  price: number
  depositAmount?: number
  currency?: string
  confirmationCode?: string | null
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  notes?: string | null
  staffId?: string | null
  staffName?: string | null
  createdAt?: string
}
