import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { devicesApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

export function useNotifications(): void {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    void registerForPushNotificationsAsync()
  }, [user])
}

async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID'

  try {
    await devicesApi.register(tokenData.data, platform as 'IOS' | 'ANDROID')
  } catch {
    // graceful fail
  }
}
