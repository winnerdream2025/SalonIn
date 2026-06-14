import * as Location from 'expo-location'
import { useCallback, useState } from 'react'
import { Alert, Linking } from 'react-native'
import { useLocationStore } from '../store/locationStore'
import { workersApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'
import { findNearestCity } from '@salonin/config'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export const useDeviceLocation = () => {
  const setGPSLocation = useLocationStore((s) => s.setGPSLocation)
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const requestLocation = useCallback(async (): Promise<boolean> => {
    setStatus('requesting')
    try {
      const { status: permStatus, canAskAgain } = await Location.requestForegroundPermissionsAsync()

      if (permStatus !== 'granted') {
        setStatus('denied')
        if (!canAskAgain) {
          Alert.alert(
            'Location access required',
            'My Salon In uses your location to show nearby beauty professionals and salons. Please enable location access in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            ]
          )
        }
        return false
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const { latitude: lat, longitude: lng } = position.coords
      const city = findNearestCity(lat, lng)
      setGPSLocation({
        cityId: city.id,
        lat,
        lng,
        cityName: city.name,
        countryCode: city.countryCode,
        flag: city.flag,
      })

      if (user?.role === 'WORKER') {
        workersApi.updateLocation(lat, lng).catch(() => {})
      }

      setStatus('granted')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [setGPSLocation, user])

  return { requestLocation, status }
}
