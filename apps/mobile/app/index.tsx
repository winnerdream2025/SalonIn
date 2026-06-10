import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  if (isLoading) return null
  if (user) return <Redirect href="/(tabs)" />
  return <Redirect href="/(auth)/login" />
}
