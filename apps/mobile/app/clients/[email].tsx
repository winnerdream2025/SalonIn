import React from 'react'
import ClientProfileScreen from '../../src/screens/bookings/ClientProfileScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ClientProfileRoute() {
  return (
    <ProviderRoute>
      <ClientProfileScreen />
    </ProviderRoute>
  )
}
