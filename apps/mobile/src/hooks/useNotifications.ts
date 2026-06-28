import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { router } from 'expo-router'
import { devicesApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications(): void {
  const user = useAuthStore((s) => s.user)
  const responseListenerRef = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    if (!user) return

    void registerForPushNotificationsAsync()

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>
        handleNotificationTap(data)
      },
    )

    return () => {
      responseListenerRef.current?.remove()
    }
  }, [user])
}

function handleNotificationTap(data: Record<string, unknown>): void {
  const type = data.type as string | undefined
  const event = data.event as string | undefined
  const conversationId = data.conversationId as string | undefined
  const jobId = data.jobId as string | undefined
  const bookingId = data.bookingId as string | undefined

  if (conversationId && (type === 'NEW_MESSAGE' || type === 'CHAT_REQUEST' || type === 'CHAT_REQUEST_ACCEPTED')) {
    router.push(`/chat/${conversationId}` as never)
  } else if (jobId && (type === 'NEW_APPLICATION' || type === 'APPLICATION_ACCEPTED' || type === 'APPLICATION_DECLINED' || type === 'NEW_JOB_MATCH')) {
    router.push(`/jobs/${jobId}` as never)
  } else if (bookingId && (typeof event === 'string' && event.startsWith('booking.'))) {
    router.push('/provider-bookings' as never)
  } else {
    router.push('/notifications' as never)
  }
}

async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D85A30',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return

  const projectId = '4b8c3233-ffb4-4c1d-b74b-bebdf9298f7b'
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID'

  try {
    await devicesApi.register(tokenData.data, platform as 'IOS' | 'ANDROID')
  } catch {
    // graceful fail
  }
}
