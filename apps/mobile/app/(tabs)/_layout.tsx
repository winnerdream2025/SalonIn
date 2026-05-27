import React from 'react'
import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'

export default function TabsLayout() {
  const role = useAuthStore((s) => s.user?.role)
  const isSalon = role === Role.SALON

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#1E1E1E',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#D85A30',
        tabBarInactiveTintColor: '#555555',
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
