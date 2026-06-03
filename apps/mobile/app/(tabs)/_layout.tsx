import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { useConversations } from '../../src/hooks/useConversations'
import { useChatRequests } from '../../src/hooks/useChatRequests'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@salonin/ui'
import { Role } from '@salonin/types'

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets()
  const role = useAuthStore((s) => s.user?.role)
  const isLoggedIn = useAuthStore((s) => s.user != null)
  const isSalon = role === Role.SALON
  const { theme } = useTheme()
  const { conversations } = useConversations()
  const { pendingCount } = useChatRequests()
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const messagesBadge = isLoggedIn ? unreadCount + pendingCount : 0

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border.default,
          borderTopWidth: 0.5,
          height: 56 + bottom,
          paddingBottom: Math.max(bottom, 8),
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#D85A30',
        tabBarInactiveTintColor: theme.text.secondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: isSalon ? 'Workers' : 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarLabel: isSalon ? 'My Jobs' : 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
          tabBarBadge: messagesBadge > 0 ? messagesBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.brand.primary, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: isSalon ? 'My Salon' : 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isSalon ? 'business-outline' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
