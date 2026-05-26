import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import { Role } from '@salonin/types'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Redirect href="/(auth)/login" />
  if (user.role === Role.WORKER) return <Redirect href="/onboarding" />
  return <Redirect href="/(tabs)" />
}
