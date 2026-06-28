import { api } from './client'

export interface ClientProfileData {
  id: string
  userId: string
  name: string
  phone: string | null
  photoUrl: string | null
  preferredSpecialties: string[]
  createdAt: string
  updatedAt: string
}

export interface UpdateClientProfilePayload {
  name?: string
  phone?: string
  photoUrl?: string
  preferredSpecialties?: string[]
}

export const clientProfileApi = {
  getMe: (): Promise<ClientProfileData> =>
    api.get('/client-profile').then((r: { data: { data: ClientProfileData } }) => r.data.data),

  update: (payload: UpdateClientProfilePayload): Promise<ClientProfileData> =>
    api.patch('/client-profile', payload).then((r: { data: { data: ClientProfileData } }) => r.data.data),
}
