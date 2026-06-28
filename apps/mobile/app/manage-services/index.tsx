import React from 'react'
import ManageServicesScreen from '../../src/screens/bookings/ManageServicesScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ManageServicesRoute() {
  return (
    <ProviderRoute>
      <ManageServicesScreen />
    </ProviderRoute>
  )
}
