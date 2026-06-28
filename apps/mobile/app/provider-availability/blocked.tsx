import React from 'react'
import BlockedTimeScreen from '../../src/screens/bookings/BlockedTimeScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function BlockedTimeRoute() {
  return (
    <ProviderRoute>
      <BlockedTimeScreen />
    </ProviderRoute>
  )
}
