import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import WorkerOwnProfile from '../../src/screens/profile/WorkerOwnProfileScreen'
import SalonOwnProfile from '../../src/screens/profile/SalonOwnProfileScreen'
import ClientOwnProfile from '../../src/screens/profile/ClientOwnProfileScreen'
import { AuthPromptView } from '../../src/components/AuthPromptView'

export default function ProfileScreen() {
  const { user } = useAuthStore()

  if (user) {
    if (user.accountType === 'CLIENT') return <ClientOwnProfile />
    if (user.role === Role.SALON) return <SalonOwnProfile />
    return <WorkerOwnProfile />
  }

  return (
    <AuthPromptView
      title="Sign in to view your profile"
      body="Create an account to build your professional profile and portfolio."
      redirectPath="/(tabs)/profile"
    />
  )
}
