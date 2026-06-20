import * as Location from 'expo-location'
import { useCallback, useState } from 'react'
import { Alert, Linking } from 'react-native'
import { useLocationStore } from '../store/locationStore'
import { workersApi, salonsApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'
import { findNearestCity } from '@salonin/config'
import { countryCodeToFlag } from '../utils/countryFlag'
import { reverseGeocodeWithGoogle } from '../utils/googlePlaces'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

/** Build a human-readable location label from reverse-geocoded address components */
function buildLocationLabel(geo: Location.LocationGeocodedAddress): string {
  const locality =
    geo.city ??
    geo.subregion ??
    geo.district ??
    null

  const region = geo.region ?? geo.country ?? ''

  if (locality && region && locality !== region) {
    return `${locality}, ${region}`
  }
  return locality ?? region ?? ''
}

export const useDeviceLocation = () => {
  const setGPSLocation = useLocationStore((s) => s.setGPSLocation)
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const requestLocation = useCallback(async (): Promise<boolean> => {
    setStatus('requesting')
    try {
      const { status: permStatus, canAskAgain } =
        await Location.requestForegroundPermissionsAsync()

      if (permStatus !== 'granted') {
        setStatus('denied')
        if (!canAskAgain) {
          Alert.alert(
            'Location access required',
            'My Salon In uses your location to show nearby beauty professionals and salons. Please enable location access in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            ],
          )
        }
        return false
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { latitude: lat, longitude: lng } = position.coords

      // Map to nearest WorldCity — used only as cityId for backend compat, never displayed
      const city = findNearestCity(lat, lng)

      // Defaults: fall back to WorldCity if all geocoding fails
      let resolvedName = city.name
      let countryCode = city.countryCode
      let flag = city.flag

      // 1️⃣ Try Google Geocoding API first (accurate, consistent)
      const googleResult = await reverseGeocodeWithGoogle(lat, lng)
      if (googleResult) {
        resolvedName = googleResult.name
        countryCode = googleResult.countryCode
        flag = countryCodeToFlag(googleResult.countryCode)
      } else {
        // 2️⃣ Fall back to system geocoder (Apple CLGeocoder / Android)
        try {
          const [geo] = await Location.reverseGeocodeAsync(
            { latitude: lat, longitude: lng },
            { useGoogleMaps: false },
          )
          if (geo) {
            const label = buildLocationLabel(geo)
            if (label.length > 0) resolvedName = label
            if (geo.isoCountryCode) {
              countryCode = geo.isoCountryCode
              flag = countryCodeToFlag(geo.isoCountryCode)
            }
          }
        } catch {
          // fall back to WorldCity name
        }
      }

      setGPSLocation({
        cityId: city.id,
        lat,
        lng,
        cityName: resolvedName,
        countryCode,
        flag,
      })

      // Sync location to backend for the user's profile
      if (user?.role === 'WORKER') {
        workersApi.updateLocation(lat, lng).catch(() => {})
      } else if (user?.role === 'SALON') {
        salonsApi.updateLocation(lat, lng).catch(() => {})
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
