// SalonIn native booking engine types

export interface ProviderService {
  id: string
  providerId: string
  providerType: string
  name: string
  description: string | null
  duration: number
  price: number
  currency: string
  category: string | null
  isActive: boolean
  sortOrder: number
  depositAmount: number | null
  images: string[]
  bufferBefore: number
  bufferAfter: number
  createdAt: string
  updatedAt: string
}

export interface AvailabilityException {
  id: string
  providerId: string
  providerType: string
  date: string
  startTime: string | null
  endTime: string | null
  isBlocked: boolean
  reason: string | null
  createdAt: string
}

export interface CreateExceptionPayload {
  date: string
  startTime?: string
  endTime?: string
  isBlocked?: boolean
  reason?: string
}

export interface CreateServicePayload {
  name: string
  description?: string
  duration: number
  price: number
  currency?: string
  category?: string
  depositAmount?: number
  images?: string[]
  bufferBefore?: number
  bufferAfter?: number
}

export interface UpdateServicePayload extends Partial<CreateServicePayload> {
  isActive?: boolean
  sortOrder?: number
}

export interface BookingPolicySettings {
  acceptsBookings?: boolean
  instantBooking?: boolean
  requiresDeposit?: boolean
  cancellationWindowHours?: number
  rescheduleWindowHours?: number
  lateFeeEnabled?: boolean
  lateFeeAmount?: number
  homeServiceEnabled?: boolean
  travelServiceEnabled?: boolean
  travelRadius?: number
  travelFee?: number
}

export interface AvailabilitySlot {
  time: string       // "HH:mm"
  available: boolean
}

export interface DayAvailabilityRule {
  dayOfWeek: number  // 0=Sun … 6=Sat
  isOpen: boolean
  openTime: string   // "09:00"
  closeTime: string  // "17:00"
}

export interface CreateBookingPayload {
  providerId:    string
  providerType:  string
  serviceId:     string
  clientName:    string
  clientEmail:   string
  clientPhone?:  string
  date:          string  // YYYY-MM-DD
  startTime:     string  // HH:mm
  notes?:        string
  intakeFormId?: string
  intakeAnswers?: { questionId: string; answer: unknown }[]
  isWalkIn?: boolean
  isProviderCreated?: boolean
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export interface BookingResult {
  id: string
  providerId: string
  providerType: string
  serviceId: string
  service?: { name: string; category: string | null; duration?: number }
  clientUserId: string | null
  clientName: string
  clientEmail: string
  clientPhone: string | null
  date: string
  startTime: string
  endTime: string
  status: BookingStatus
  price: number
  currency: string
  notes: string | null
  providerNotes: string | null
  cancelToken: string
  rescheduleToken: string | null
  confirmationCode: string | null
  createdAt: string
  updatedAt: string
  intakeResponse?: {
    answers: { questionId: string; answer: unknown }[]
    form?: { questions: { id: string; question: string; type: string; options?: string[] }[] } | null
  } | null
}

export interface BookingAnalytics {
  period: '7d' | '30d' | '90d' | '1y'
  total: number
  completed: number
  cancelled: number
  noShows: number
  revenue: number
  completionRate: number
  cancellationRate: number
  noShowRate: number
  repeatClients: number
  platformFees: number
  netRevenue: number
  topServices: { name: string; count: number; revenue: number }[]
}

export interface ClientSummary {
  clientName: string
  clientEmail: string
  clientPhone: string | null
  clientUserId: string | null
  totalBookings: number
  totalSpent: number
  completedBookings: number
  cancelledBookings: number
  noShowBookings: number
  lastVisit: string | null
  favoriteService: string | null
}

export interface PaymentIntent {
  clientSecret: string
  paymentIntentId: string
}

export interface StripeConnectStatus {
  connected: boolean
  accountId: string | null
  onboardingUrl: string | null
}

export interface IntakeQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select'
  required: boolean
  options?: string[]
}

export interface WaitlistEntry {
  id: string
  providerId: string
  providerType: string
  serviceId: string
  date: string
  startTime: string
  clientUserId: string | null
  clientName: string
  clientEmail: string
  clientPhone: string | null
  notified: boolean
  createdAt: string
  service?: { name: string } | null
}

export interface IntakeForm {
  id: string
  title: string
  description: string | null
  questions: IntakeQuestion[]
  serviceIds: string[]
}
