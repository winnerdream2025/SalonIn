import React from 'react'
import GalleryManagementScreen from '../../src/screens/bookings/GalleryManagementScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function GalleryRoute() {
  return (
    <ProviderRoute>
      <GalleryManagementScreen />
    </ProviderRoute>
  )
}
