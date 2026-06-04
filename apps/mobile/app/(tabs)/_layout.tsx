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
  const { theme, isDark } = useTheme()
  const { conversations } = useConversations()
  const { pendingCount, isLoaded: chatRequestsLoaded } = useChatRequests()
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const messagesBadge = isLoggedIn && chatRequestsLoaded ? unreadCount + pendingCount : 0

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.surface,
          borderTopWidth: 0,
          height: 56 + bottom,
          paddingBottom: Math.max(bottom, 8),
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarLabel: isSalon ? 'My Jobs' : 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
          ),
          tabBarBadge: messagesBadge > 0 ? messagesBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.brand.primary, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: isSalon ? 'My Salon' : 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={isSalon ? (focused ? 'business' : 'business-outline') : (focused ? 'person' : 'person-outline')} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
