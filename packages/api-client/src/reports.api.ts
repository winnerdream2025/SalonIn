import { api } from './client'
import type { ReportType } from '@salonin/types'

export const reportsApi = {
  createReport: (reportedUserId: string, type: ReportType, reason?: string): Promise<void> =>
    api.post('/reports', { reportedUserId, type, reason }).then(() => undefined),
}
