import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@salonin/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import ConversationsListScreen from '../../src/screens/messages/ConversationsListScreen'

export default function MessagesTab() {
  const { user } = useAuthStore()
  const { theme } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  if (user) return <ConversationsListScreen />

  return (
    <View style={{
      flex: 1,
      backgroundColor: theme.bg.base,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: insets.bottom,
    }}>
      <View style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: theme.bg.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 28 }}>✉</Text>
      </View>
      <Text style={{
        fontSize: 20,
        fontWeight: '700',
        color: theme.text.primary,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.4,
      }}>
        Sign in to message
      </Text>
      <Text style={{
        fontSize: 14,
        color: theme.text.secondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 32,
      }}>
        Create a free account to message beauty professionals and salon owners directly.
      </Text>
      <Pressable
        onPress={() => router.push('/(auth)/register')}
        style={{
          width: '100%',
          backgroundColor: '#D85A30',
          borderRadius: 13,
          padding: 14,
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
          Create free account
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        style={{
          width: '100%',
          backgroundColor: theme.bg.elevated,
          borderRadius: 13,
          padding: 14,
          alignItems: 'center',
          borderWidth: 0.5,
          borderColor: theme.border.default,
        }}
      >
        <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '600' }}>
          Sign in
        </Text>
      </Pressable>
    </View>
  )
}
