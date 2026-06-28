import React from 'react'
import ClientListScreen from '../../src/screens/bookings/ClientListScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ClientsRoute() {
  return (
    <ProviderRoute>
      <ClientListScreen />
    </ProviderRoute>
  )
}
