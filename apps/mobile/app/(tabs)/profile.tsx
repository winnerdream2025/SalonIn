import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import WorkerOwnProfile from '../../src/screens/profile/WorkerOwnProfileScreen'
import SalonOwnProfile from '../../src/screens/profile/SalonOwnProfileScreen'

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user)

  if (user?.role === Role.SALON) return <SalonOwnProfile />
  return <WorkerOwnProfile />
}
