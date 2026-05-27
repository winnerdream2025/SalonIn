import * as Location from 'expo-location'
import { useCallback, useState } from 'react'
import { useLocationStore } from '../store/locationStore'
import { workersApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

const CITY_REFS = [
  { id: 'dmv',     lat: 38.9072, lng: -77.0369 },
  { id: 'atlanta', lat: 33.7490, lng: -84.3880 },
  { id: 'houston', lat: 29.7604, lng: -95.3698 },
  { id: 'miami',   lat: 25.7617, lng: -80.1918 },
]

const detectCity = (lat: number, lng: number): string => {
  let nearest = CITY_REFS[0]!
  let minDist = Infinity
  for (const city of CITY_REFS) {
    const d = Math.abs(lat - city.lat) + Math.abs(lng - city.lng)
    if (d < minDist) { minDist = d; nearest = city }
  }
  return nearest.id
}

export const useDeviceLocation = () => {
  const setGPSLocation = useLocationStore((s) => s.setGPSLocation)
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const requestLocation = useCallback(async (): Promise<boolean> => {
    setStatus('requesting')
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync()

      if (permStatus !== 'granted') {
        setStatus('denied')
        return false
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const { latitude: lat, longitude: lng } = position.coords
      const cityId = detectCity(lat, lng)
      setGPSLocation(cityId, lat, lng)

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
