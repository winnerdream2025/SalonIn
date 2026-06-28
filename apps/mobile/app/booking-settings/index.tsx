import React from 'react'
import BookingSettingsScreen from '../../src/screens/bookings/BookingSettingsScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function BookingSettingsRoute() {
  return (
    <ProviderRoute>
      <BookingSettingsScreen />
    </ProviderRoute>
  )
}
