import React from 'react'
import AnalyticsDashboardScreen from '../../src/screens/bookings/AnalyticsDashboardScreen'
import { ProviderRoute } from '../../src/components/ProviderRoute'

export default function AnalyticsRoute() {
  return (
    <ProviderRoute>
      <AnalyticsDashboardScreen />
    </ProviderRoute>
  )
}
