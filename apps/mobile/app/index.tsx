import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />
}
