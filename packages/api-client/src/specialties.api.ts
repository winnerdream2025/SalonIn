import { api } from './client'

export const specialtiesApi = {
  getAll: (): Promise<Record<string, string[]>> =>
    api.get<Record<string, string[]>>('/specialties').then((r) => r.data),
}
