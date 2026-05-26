import type { Availability, EmploymentType, Role, PortfolioItem, ReportType } from '@prisma/client'

// ─── Prisma model re-exports ──────────────────────────────────────────────────

export type {
  User,
  WorkerProfile,
  SalonProfile,
  JobPost,
  JobApplication,
  PortfolioItem,
  Conversation,
  ConversationParticipant,
  Message,
  Report,
} from '@prisma/client'

// ─── Enum re-exports (runtime values) ────────────────────────────────────────

export { Role, Availability, EmploymentType, MediaType, AppStatus, ReportType, ReportStatus, Platform } from '@prisma/client'

export type { UserDevice } from '@prisma/client'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface FindNearbyWorkersDto {
  lat: number
  lng: number
  radiusMiles: number
  cityId: string
  specialty?: string
  availability?: Availability
  cursor?: string
}

export interface CreateJobPostDto {
  title: string
  description: string
  specialty: string
  payStructure: string
  type: EmploymentType
  isUrgent?: boolean
  cityId: string
  expiresAt: string
}

export interface UpdateAvailabilityDto {
  availability: Availability
  location?: {
    lat: number
    lng: number
  }
}

export interface SendMessageDto {
  conversationId: string
  content?: string
  mediaUrl?: string
}

export interface CreateReportDto {
  reportedUserId: string
  type: ReportType
  reason?: string
}

// ─── UI card types ────────────────────────────────────────────────────────────

export interface WorkerCardData {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[]
  availability: Availability
  distanceMiles: number | null
  experienceYears: number
  isVerified: boolean
  cityId: string
}

export interface SalonCardData {
  id: string
  name: string
  photoUrls: string[]
  specialties: string[]
  isHiring: boolean
  isVerified: boolean
  distanceMiles: number | null
  cityId: string
}

export interface JobPostCardData {
  id: string
  title: string
  specialty: string
  payStructure: string
  type: EmploymentType
  isUrgent: boolean
  cityId: string
  expiresAt: string
  salonName: string
  salonPhotoUrl: string | null
}

export interface ConversationPreview {
  id: string
  otherParticipant: {
    userId: string
    name: string
    photoUrl: string | null
    role: Role
  }
  lastMessage: {
    content: string | null
    mediaUrl: string | null
    createdAt: string
    isRead: boolean
    senderId: string
  } | null
  unreadCount: number
  createdAt: string
}

// ─── Full profile types (with relations) ─────────────────────────────────────

export interface WorkerProfileFull {
  id: string
  userId: string
  name: string
  photoUrl: string | null
  bio: string | null
  specialties: string[]
  experienceYears: number
  radiusMiles: number
  availability: Availability
  isVerified: boolean
  cityId: string
  languages: string[]
  expectedPay: string | null
  employmentTypes: EmploymentType[]
  licenseNumber: string | null
  portfolioItems: PortfolioItem[]
  user: {
    email: string
    role: Role
    createdAt: string
  }
}

// ─── Generic response wrappers ────────────────────────────────────────────────

export interface CursorResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code: string
  statusCode: number
}
