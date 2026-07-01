import React from 'react'
import { useAuthStore } from '../../src/store/authStore'
import ConversationsListScreen from '../../src/screens/messages/ConversationsListScreen'
import { AuthPromptView } from '../../src/components/AuthPromptView'

export default function MessagesTab() {
  const { user } = useAuthStore()

  if (user) return <ConversationsListScreen />

  return (
    <AuthPromptView
      icon="✉"
      title="Sign in to message"
      body="Create a free account to message beauty professionals and salon owners directly."
      redirectPath="/(tabs)/messages"
    />
  )
}
