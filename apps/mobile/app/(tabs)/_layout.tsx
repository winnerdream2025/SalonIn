import React, { memo, useMemo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native'
import { Tabs, router } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { useChatStore } from '../../src/store/chatStore'
import { useChatRequests } from '../../src/hooks/useChatRequests'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, Avatar } from '@salonin/ui'
import { Role } from '@salonin/types'
import Svg, { Path } from 'react-native-svg'

// ── Sparkle search icon ──────────────────────────────────────────────────────

function SparkleSearchIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2.5l.45 1.35 1.35.45-1.35.45L16 6.2l-.45-1.45L14.2 4.3l1.35-.45L16 2.5z"
        fill={color}
      />
    </Svg>
  )
}

// ── Custom floating tab bar ──────────────────────────────────────────────────

const CustomTabBar = memo(function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { theme, isDark } = useTheme()
  const isIPad = Platform.OS === 'ios' && width >= 768

  const tabBg = isDark ? '#1C1C1E' : '#FFFFFF'
  const activePillBg = isDark ? 'rgba(255,255,255,0.10)' : '#F0F0F0'
  const tabH = isIPad ? 60 : 52
  const pb = Math.max(bottom, 10)

  return (
    <View style={[styles.outerRow, { paddingBottom: pb }]}>
      {/* Floating pill tab bar */}
      <View style={[styles.tabBar, { backgroundColor: tabBg, height: tabH }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const isFocused = state.index === index
          const iconColor = isFocused ? theme.brand.primary : (isDark ? '#666' : '#9A9A9A')

          const iconEl = options.tabBarIcon?.({ focused: isFocused, color: iconColor, size: 22 })

          const rawLabel = options.tabBarLabel ?? options.title ?? route.name
          const label = typeof rawLabel === 'string' ? rawLabel : route.name

          const badge = options.tabBarBadge != null ? Number(options.tabBarBadge) : undefined

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused && { backgroundColor: activePillBg }]}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
            >
              <View style={styles.iconWrap}>
                {iconEl}
                {badge != null && badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.brand.primary }]}>
                    <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color: iconColor }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Sparkle / AI search floating button */}
      <Pressable
        onPress={() => router.push('/search')}
        style={[styles.searchBtn, { backgroundColor: tabBg, height: tabH, width: tabH }]}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <SparkleSearchIcon size={22} color={theme.brand.primary} />
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  outerRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap: 8,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
    padding: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16,
    paddingVertical: 5,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  searchBtn: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
  },
})

// ── Layout ───────────────────────────────────────────────────────────────────

function ProfileTabIcon({
  color,
  size,
  focused,
  photoUrl,
  isSalon,
  theme,
}: {
  color: string
  size: number
  focused: boolean
  photoUrl?: string
  isSalon: boolean
  theme: { brand: { primary: string } }
}) {
  if (!isSalon && photoUrl) {
    return (
      <Avatar
        uri={photoUrl}
        name="Me"
        size="sm"
        style={{
          borderWidth: focused ? 2 : 0,
          borderColor: focused ? theme.brand.primary : 'transparent',
        }}
      />
    )
  }
  return (
    <Ionicons
      name={isSalon ? (focused ? 'business' : 'business-outline') : (focused ? 'person-circle' : 'person-circle-outline')}
      size={size}
      color={color}
    />
  )
}

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const isLoggedIn = user != null
  const isSalon = role === Role.SALON
  const isClient = (user as any)?.accountType === 'CLIENT'
  const { theme } = useTheme()
  const unreadCount = useChatStore((s) => s.unreadCount)
  const notifUnreadCount = useChatStore((s) => s.notifUnreadCount)
  const { pendingCount, isLoaded: chatRequestsLoaded } = useChatRequests()
  const messagesBadge = useMemo(
    () => (isLoggedIn && chatRequestsLoaded ? unreadCount + pendingCount + notifUnreadCount : 0),
    [isLoggedIn, chatRequestsLoaded, unreadCount, pendingCount, notifUnreadCount],
  )
  const photoUrl = (user as any)?.photoUrl

  const renderTabBar = useCallback((props: BottomTabBarProps) => <CustomTabBar {...props} />, [])

  const indexOptions = useMemo(
    () => ({
      tabBarLabel: isSalon ? 'Workers' : 'Discover',
      tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
      ),
    }),
    [isSalon],
  )

  const jobsOptions = useMemo(
    () => ({
      tabBarLabel: isSalon ? 'My Jobs' : 'Jobs',
      tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />
      ),
    }),
    [isSalon],
  )

  const messagesOptions = useMemo(
    () => ({
      tabBarLabel: 'Inbox',
      tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
      ),
      tabBarBadge: messagesBadge > 0 ? messagesBadge : undefined,
    }),
    [messagesBadge],
  )

  const profileOptions = useMemo(
    () => ({
      tabBarLabel: isClient ? 'Bookings' : isSalon ? 'My Salon' : 'Profile',
      tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <ProfileTabIcon
          color={color}
          size={size}
          focused={focused}
          photoUrl={photoUrl}
          isSalon={isSalon}
          theme={theme}
        />
      ),
    }),
    [isClient, isSalon, photoUrl, theme],
  )

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tabs.Screen name="index" options={indexOptions} />
      <Tabs.Screen name="jobs" options={jobsOptions} />
      <Tabs.Screen name="messages" options={messagesOptions} />
      <Tabs.Screen name="profile" options={profileOptions} />
    </Tabs>
  )
}
