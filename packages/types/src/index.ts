import type { Availability, EmploymentType, ListingType, Role, PortfolioItem, ReportType, AppStatus, ChatRequestStatus } from '@prisma/client'
import type { WorkerPayType, JobPayType } from '@salonin/config'

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

export { Role, Availability, EmploymentType, ListingType, MediaType, AppStatus, ReportType, ReportStatus, Platform, ChatRequestStatus } from '@prisma/client'
export type { WorkerPayType, JobPayType } from '@salonin/config'

export interface AvailabilitySchedule {
  days: string[]
  startTime: string
  endTime: string
}

export interface PayStructure {
  payType: WorkerPayType | JobPayType
  payMin?: number | null
  payMax?: number | null
  payPercentage?: number | null
  seatRate?: number | null
  payNote?: string | null
}

export type { UserDevice } from '@prisma/client'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface FindNearbyWorkersDto {
  lat: number
  lng: number
  radiusMiles: number
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
  listingType?: ListingType
  isUrgent?: boolean
  // Normalized location — coordinates drive geo filtering, the rest are display.
  lat: number
  lng: number
  placeId?: string
  city?: string
  state?: string
  country?: string
  formattedAddress?: string
  expiresAt: string
  spacePhotos?: string[]
  spaceSize?: string
  spaceAmenities?: string[]
  rentalDeposit?: number
  availableFrom?: string
  jobPayType?: JobPayType
  payMin?: number
  payMax?: number
  payPercentage?: number
  seatRate?: number
  payNote?: string
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
  city: string | null
  state?: string | null
  country?: string | null
  rating?: number
  jobsDone?: number
  portfolioUrls?: string[]
  /** Portfolio media (images + videos) for the card strip, images first. */
  portfolioMedia?: Array<{ url: string; isVideo: boolean }>
  // Card enrichment (optional)
  badge?: 'Top Rated' | 'Rising Star' | 'Expert' | 'New'
  reviewCount?: number
  jobsThisMonth?: number
  replyTimeMinutes?: number
  rateRange?: string
  rateNote?: string
  workerPayType?: WorkerPayType | null
  payMin?: number | null
  payMax?: number | null
  payPercentage?: number | null
  seatRate?: number | null
  isSaved?: boolean
  bio: string | null
}

export interface SalonCardData {
  id: string
  name: string
  photoUrls: string[]
  specialties: string[]
  isHiring: boolean
  isVerified: boolean
  distanceMiles: number | null
  city: string | null
  state?: string | null
  country?: string | null
}

export interface JobPostCardData {
  id: string
  title: string
  description?: string
  specialty: string
  payStructure: string
  type: EmploymentType
  listingType?: ListingType
  isUrgent: boolean
  city: string | null
  state?: string | null
  country?: string | null
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
  // Space / rental fields (optional — only present on RENTAL / SPACE listings)
  spaceSize?: string
  spaceAmenities?: string[]
  spacePhotos?: string[]
  rentalDeposit?: number
  availableFrom?: string
  isSaved?: boolean
  // Structured pay (optional)
  jobPayType?: string | null
  payMin?: number | null
  payMax?: number | null
  payPercentage?: number | null
  seatRate?: number | null
  payNote?: string | null
  // Geo (optional — only present when queried by lat/lng)
  distanceMiles?: number
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
  city: string | null
  state: string | null
  country: string | null
  languages: string[]
  expectedPay: string | null
  rateRange: string | null
  rateNote: string | null
  workerPayType: string | null
  payMin: number | null
  payMax: number | null
  payPercentage: number | null
  seatRate: number | null
  rating: number
  reviewCount: number
  employmentTypes: EmploymentType[]
  licenseNumber: string | null
  availabilitySchedule: AvailabilitySchedule | null
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
  city: string | null
  state: string | null
  country: string | null
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
  jobPosts: Array<{
    id: string
    title: string
    specialty: string
    payStructure: string
    type: EmploymentType
    listingType: ListingType
    isUrgent: boolean
    city: string | null
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
  listingType: ListingType
  isUrgent: boolean
  city: string | null
  state: string | null
  country: string | null
  expiresAt: Date
  isActive: boolean
  createdAt: Date
  salon: {
    name: string
    photoUrls: string[]
    description: string | null
    city: string | null
    userId: string
    isVerified: boolean
    rating: number
    reviewCount: number
  }
  applicantCount: number
  spaceSize?: string | null
  spaceAmenities: string[]
  spacePhotos: string[]
  rentalDeposit?: number | null
  availableFrom?: Date | null
  jobPayType?: string | null
  payMin?: number | null
  payMax?: number | null
  payPercentage?: number | null
  seatRate?: number | null
  payNote?: string | null
  // Geo (job-specific coordinates; falls back to the salon's location) — used to
  // compute distance and warn workers applying beyond their travel radius.
  lat?: number | null
  lng?: number | null
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
    city: string | null
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
    city: string | null
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

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewCardData {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  repliedAt: string | null
  authorId: string
  subjectId: string
  authorName: string
  authorPhotoUrl: string | null
  authorRole: Role
  createdAt: string
}

export interface CreateReviewDto {
  subjectId: string
  rating: number
  comment?: string
}

export interface CanReviewResponse {
  canReview: boolean
  existingReview: ReviewCardData | null
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
