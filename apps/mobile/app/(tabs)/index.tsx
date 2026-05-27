import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import DiscoveryFeedScreen from '../../src/screens/feed/DiscoveryFeedScreen'
import JobFeedScreen from '../../src/screens/feed/JobFeedScreen'

export default function IndexTab() {
  const role = useAuthStore((s) => s.user?.role)

  if (role === Role.WORKER) return <JobFeedScreen />
  return <DiscoveryFeedScreen />
}
