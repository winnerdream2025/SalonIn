import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import DiscoveryFeedScreen from '../../src/screens/feed/DiscoveryFeedScreen'
import WorkerDashboardScreen from '../../src/screens/home/WorkerDashboardScreen'

export default function IndexTab() {
  const user = useAuthStore((s) => s.user)
  const isWorker = user?.role === Role.WORKER && user?.accountType !== 'CLIENT'

  // Workers get their dashboard (today's schedule, revenue, quick actions)
  // Clients, salons, and guests get the discovery feed
  if (isWorker) return <WorkerDashboardScreen />
  return <DiscoveryFeedScreen />
}
