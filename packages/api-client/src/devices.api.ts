import { api } from './client'

export const devicesApi = {
  register: (expoPushToken: string, platform: 'IOS' | 'ANDROID'): Promise<void> =>
    api.post('/devices', { expoPushToken, platform }).then(() => undefined),
}
