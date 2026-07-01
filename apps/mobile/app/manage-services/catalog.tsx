import React from 'react'
import ServiceCatalogScreen from '../../src/screens/bookings/ServiceCatalogScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function ServiceCatalogRoute() {
  return (
    <ProviderRoute>
      <ServiceCatalogScreen />
    </ProviderRoute>
  )
}
