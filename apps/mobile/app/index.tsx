import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading)
  if (isLoading) return null
  // Both logged-in and guest users land on the main tabs.
  // Profile / Messages tabs handle their own unauthenticated state.
  return <Redirect href="/(tabs)" />
}
