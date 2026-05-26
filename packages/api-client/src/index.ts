export { api, configureClient, setAuthTokens, clearAuthTokens, getAccessToken } from './client'
export type { ClientConfig } from './client'

export { authApi } from './auth.api'
export type { AuthResult, TokenResult, RegisterPayload, LoginPayload } from './auth.api'

export { workersApi } from './workers.api'
export type { UpdateWorkerPayload, AddPortfolioItemInput } from './workers.api'

export { salonsApi } from './salons.api'
export type { UpdateSalonPayload } from './salons.api'

export { jobsApi } from './jobs.api'
export type { ListJobsParams } from './jobs.api'

export { messagesApi } from './messages.api'

export { mediaApi } from './media.api'
export type { MediaFile, MediaFolder } from './media.api'

export { verifyApi } from './verify.api'

export { reportsApi } from './reports.api'

export { devicesApi } from './devices.api'
