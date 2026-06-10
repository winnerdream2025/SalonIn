// Prisma enum values for mobile (mirrors prisma/schema.prisma)
// Used as a Metro shim since @prisma/client is server-only

exports.Role = Object.freeze({ WORKER: 'WORKER', SALON: 'SALON', ADMIN: 'ADMIN' })

exports.Availability = Object.freeze({ NOW: 'NOW', TODAY: 'TODAY', WEEKEND: 'WEEKEND', NOT_AVAILABLE: 'NOT_AVAILABLE' })

exports.EmploymentType = Object.freeze({ FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', TEMPORARY: 'TEMPORARY', WEEKEND: 'WEEKEND', EMERGENCY: 'EMERGENCY', CONTRACT: 'CONTRACT', SEASONAL: 'SEASONAL', APPRENTICESHIP: 'APPRENTICESHIP', FREELANCE: 'FREELANCE' })

exports.ListingType = Object.freeze({ JOB: 'JOB', RENTAL: 'RENTAL', SPACE: 'SPACE' })

exports.MediaType = Object.freeze({ IMAGE: 'IMAGE', VIDEO: 'VIDEO' })

exports.AppStatus = Object.freeze({ PENDING: 'PENDING', VIEWED: 'VIEWED', ACCEPTED: 'ACCEPTED', DECLINED: 'DECLINED' })

exports.ReportType = Object.freeze({ FAKE_PROFILE: 'FAKE_PROFILE', NO_SHOW: 'NO_SHOW', INAPPROPRIATE: 'INAPPROPRIATE' })

exports.ReportStatus = Object.freeze({ PENDING: 'PENDING', REVIEWED: 'REVIEWED', DISMISSED: 'DISMISSED' })

exports.ChatRequestStatus = Object.freeze({ PENDING: 'PENDING', ACCEPTED: 'ACCEPTED', DECLINED: 'DECLINED' })
