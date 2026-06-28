import React from 'react'
import ProviderBookingsScreen from '../../src/screens/bookings/ProviderBookingsScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ProviderBookingsRoute() {
  return (
    <ProviderRoute>
      <ProviderBookingsScreen />
    </ProviderRoute>
  )
}
