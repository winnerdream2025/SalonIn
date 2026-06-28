import React from 'react'
import StripeConnectScreen from '../../src/screens/bookings/StripeConnectScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function StripeConnectRoute() {
  return (
    <ProviderRoute>
      <StripeConnectScreen />
    </ProviderRoute>
  )
}
