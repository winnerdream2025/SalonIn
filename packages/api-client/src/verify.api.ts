import { api } from './client'

export const verifyApi = {
  createIdentitySession: (): Promise<{ url: string; sessionId: string }> =>
    api.post<{ url: string; sessionId: string }>('/verify/identity').then((r) => r.data),

  submitEin: (ein: string): Promise<void> =>
    api.patch('/verify/salon/ein', { ein }).then(() => undefined),
}
