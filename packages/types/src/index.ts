import type { Availability, EmploymentType, Role, PortfolioItem, ReportType, AppStatus, ChatRequestStatus } from '@prisma/client'

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
  ChatRequest,
} from '@prisma/client'

// ─── Enum re-exports (runtime values) ────────────────────────────────────────

export { Role, Availability, EmploymentType, MediaType, AppStatus, ReportType, ReportStatus, Platform, ChatRequestStatus } from '@prisma/client'

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
  rating?: number
  jobsDone?: number
  portfolioUrls?: string[]
  // Card enrichment (optional)
  badge?: 'Top Rated' | 'Rising Star' | 'Expert' | 'New'
  reviewCount?: number
  jobsThisMonth?: number
  replyTimeMinutes?: number
  rateRange?: string
  rateNote?: string
  isSaved?: boolean
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
  // Salon enrichment (optional)
  salonId?: string
  salonCoverUrl?: string | null
  salonVerified?: boolean
  salonRating?: number
  salonReviewCount?: number
  salonHiringCount?: number
  // Engagement (optional)
  applicantCount?: number
  appliedToday?: number
  replyTime?: string
  // Pay enrichment (optional)
  estimatedWeekly?: string
  // Portfolio (optional)
  portfolioPhotoUrls?: string[]
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
  rateRange: string | null
  rateNote: string | null
  employmentTypes: EmploymentType[]
  licenseNumber: string | null
  portfolioItems: PortfolioItem[]
  user: {
    email: string
    role: Role
    createdAt: string
  }
}

// ─── Full salon profile (GET /salons/:id response) ───────────────────────────

export interface SalonProfileFull {
  id: string
  userId: string
  name: string
  description: string | null
  photoUrls: string[]
  specialties: string[]
  isHiring: boolean
  isVerified: boolean
  cityId: string
  createdAt: string
  updatedAt: string
  jobPosts: Array<{
    id: string
    title: string
    specialty: string
    payStructure: string
    type: EmploymentType
    isUrgent: boolean
    cityId: string
    expiresAt: string
    isActive: boolean
    createdAt: string
  }>
  user: { id: string; role: Role; createdAt: string }
}

// ─── Job detail type (getById response) ──────────────────────────────────────

export interface JobPostDetail {
  id: string
  salonId: string
  title: string
  description: string
  specialty: string
  payStructure: string
  type: EmploymentType
  isUrgent: boolean
  cityId: string
  expiresAt: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  salon: {
    name: string
    photoUrls: string[]
    description: string | null
    cityId: string
    userId: string
  }
  _count: { applications: number }
}

// ─── Application types ────────────────────────────────────────────────────────

export interface JobApplicationDetail {
  id: string
  jobId: string
  workerId: string
  status: AppStatus
  createdAt: Date
  worker: {
    id: string
    name: string
    photoUrl: string | null
    specialties: string[]
    availability: Availability
    isVerified: boolean
    cityId: string
    experienceYears: number
  }
}

export interface JobApplicationWithJob {
  id: string
  jobId: string
  workerId: string
  status: AppStatus
  createdAt: Date
  job: {
    id: string
    title: string
    specialty: string
    payStructure: string
    type: EmploymentType
    isUrgent: boolean
    cityId: string
    expiresAt: Date
    isActive: boolean
    salon: { name: string; photoUrls: string[] }
  }
}

// ─── Chat request types ──────────────────────────────────────────────────────

export interface ChatRequestPreview {
  id: string
  senderId: string
  receiverId: string
  status: ChatRequestStatus
  messageCount: number
  conversationId: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    photoUrl: string | null
    role: Role
  }
}

// ─── Generic response wrappers ────────────────────────────────────────────────

export interface CursorResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  usedRadius?: number
  isExpanded?: boolean
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
