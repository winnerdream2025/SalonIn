import React from 'react'
import ProviderCalendarScreen from '../../src/screens/bookings/ProviderCalendarScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ProviderCalendarRoute() {
  return (
    <ProviderRoute>
      <ProviderCalendarScreen />
    </ProviderRoute>
  )
}
