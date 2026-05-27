import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import WorkerOwnProfile from '../../src/screens/profile/WorkerOwnProfileScreen'
import SalonOwnProfile from '../../src/screens/profile/SalonOwnProfileScreen'

export default function ProfileScreen() {
  const { user } = useAuthStore()
  if (!user) return <Redirect href="/(auth)/login" />
  if (user.role === Role.SALON) return <SalonOwnProfile />
  return <WorkerOwnProfile />
}
