import React from 'react'
import HighlightsScreen from '../src/screens/profile/HighlightsScreen'
import { ProviderRoute } from '../src/components/ProviderRoute'

export default function HighlightsRoute() {
  return (
    <ProviderRoute>
      <HighlightsScreen />
    </ProviderRoute>
  )
}
