import React from 'react'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import ConversationsListScreen from '../../src/screens/messages/ConversationsListScreen'

export default function MessagesTab() {
  const { user } = useAuthStore()
  if (!user) return <Redirect href="/(auth)/login" />
  return <ConversationsListScreen />
}
