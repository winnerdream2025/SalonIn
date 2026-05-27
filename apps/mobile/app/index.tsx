import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function Index() {
  const { user } = useAuthStore()
  if (user) return <Redirect href="/(tabs)" />
  return <Redirect href="/(tabs)" />
}
