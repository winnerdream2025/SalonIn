import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import JobFeedScreen from '../../src/screens/feed/JobFeedScreen'
import SalonJobsScreen from '../../src/screens/jobs/SalonJobsScreen'

export default function JobsTab() {
  const role = useAuthStore((s) => s.user?.role)

  if (role === Role.SALON) return <SalonJobsScreen />
  return <JobFeedScreen />
}
