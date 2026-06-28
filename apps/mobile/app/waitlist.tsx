import React from 'react'
import WaitlistManagementScreen from '../src/screens/bookings/WaitlistManagementScreen'
import { ProviderRoute } from '../src/components/ProviderRoute'

export default function WaitlistRoute() {
  return (
    <ProviderRoute>
      <WaitlistManagementScreen />
    </ProviderRoute>
  )
}
