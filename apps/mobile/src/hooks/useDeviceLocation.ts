import * as Location from 'expo-location'
import { useCallback, useState } from 'react'
import { Alert, Linking } from 'react-native'
import { useLocationStore } from '../store/locationStore'
import { workersApi, salonsApi } from '@salonin/api-client'
import { useAuthStore } from '../store/authStore'
import { countryCodeToFlag } from '../utils/countryFlag'
import { reverseGeocodeWithGoogle } from '../utils/googlePlaces'
import type { SetLocationParams } from '../store/locationStore'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

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

      // Build a normalized location — Google Geocoding is the source of truth.
      // Neutral fallback used only if every geocoder fails (never a wrong city).
      let resolved: SetLocationParams = {
        lat,
        lng,
        city: '',
        country: '',
        formattedAddress: '',
      }

      // 1️⃣ Try Google Geocoding API first (accurate, consistent worldwide)
      const googleResult = await reverseGeocodeWithGoogle(lat, lng)
      if (googleResult) {
        resolved = {
          placeId: googleResult.placeId,
          lat,
          lng,
          city: googleResult.city,
          state: googleResult.state,
          country: googleResult.country,
          countryCode: googleResult.countryCode,
          flag: googleResult.countryCode
            ? countryCodeToFlag(googleResult.countryCode)
            : undefined,
          formattedAddress: googleResult.formattedAddress,
        }
      } else {
        // 2️⃣ Fall back to system geocoder (Apple CLGeocoder / Android)
        try {
          const [geo] = await Location.reverseGeocodeAsync(
            { latitude: lat, longitude: lng },
            { useGoogleMaps: false },
          )
          if (geo) {
            const cityName = geo.city ?? geo.subregion ?? geo.district ?? ''
            const region = geo.region ?? geo.country ?? ''
            if (cityName || region) {
              resolved = {
                lat,
                lng,
                city: cityName || region,
                state: geo.region ?? undefined,
                country: geo.country ?? '',
                countryCode: geo.isoCountryCode ?? undefined,
                flag: geo.isoCountryCode
                  ? countryCodeToFlag(geo.isoCountryCode)
                  : undefined,
                formattedAddress:
                  cityName && region && cityName !== region
                    ? `${cityName}, ${region}`
                    : cityName || region,
              }
            }
          }
        } catch {
          // keep neutral fallback
        }
      }

      setGPSLocation(resolved)

      // Sync location to backend for the user's profile (geo + display fields)
      const displayCity = resolved.city === 'Selected area' ? undefined : resolved.city
      if (user?.role === 'WORKER') {
        workersApi
          .updateLocation(lat, lng, displayCity, resolved.state, resolved.country)
          .catch(() => {})
      } else if (user?.role === 'SALON') {
        salonsApi
          .updateLocation(lat, lng, displayCity, resolved.state, resolved.country)
          .catch(() => {})
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
