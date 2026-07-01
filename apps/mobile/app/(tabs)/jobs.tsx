import React, { useState, useCallback } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Text, useTheme } from '@salonin/ui'
import { useAuthStore } from '../../src/store/authStore'
import { Role } from '@salonin/types'
import JobFeedScreen from '../../src/screens/feed/JobFeedScreen'
import SalonJobsScreen from '../../src/screens/jobs/SalonJobsScreen'
import BookingsScreen from '../../src/screens/bookings/BookingsScreen'
import ProviderBookingsScreen from '../../src/screens/bookings/ProviderBookingsScreen'

// ── Worker job split (apartment logic: Schedule | Job Board) ──────────────────

type WorkerTab = 'schedule' | 'jobboard'

function WorkerJobsScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<WorkerTab>('schedule')

  const handleTabPress = useCallback((tab: WorkerTab) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveTab(tab)
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      {/* ── Split tab header — "apartment logic" ── */}
      <View style={[styles.splitHeader, { paddingTop: top + 4, backgroundColor: theme.bg.base, borderBottomColor: theme.border.subtle }]}>
        <View style={styles.splitTabRow}>
          <TouchableOpacity
            onPress={() => handleTabPress('schedule')}
            activeOpacity={0.8}
            style={[
              styles.splitTab,
              activeTab === 'schedule' && { backgroundColor: theme.text.primary },
            ]}
          >
            <Text style={[
              styles.splitTabText,
              { color: activeTab === 'schedule' ? theme.bg.base : theme.text.secondary },
            ]}>
              My Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTabPress('jobboard')}
            activeOpacity={0.8}
            style={[
              styles.splitTab,
              activeTab === 'jobboard' && { backgroundColor: '#D85A30' },
            ]}
          >
            <Text style={[
              styles.splitTabText,
              { color: activeTab === 'jobboard' ? '#FFFFFF' : theme.text.secondary },
            ]}>
              Job Board
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'jobboard' && (
          <Text style={[styles.splitSubtitle, { color: theme.text.tertiary }]}>
            Job posts from salons · Rentals · Spaces
          </Text>
        )}
        {activeTab === 'schedule' && (
          <Text style={[styles.splitSubtitle, { color: theme.text.tertiary }]}>
            Bookings you receive from clients
          </Text>
        )}
      </View>

      {/* ── Content ── */}
      {activeTab === 'schedule' ? (
        <ProviderBookingsScreen hideHeader />
      ) : (
        <JobFeedScreen hideHeader />
      )}
    </View>
  )
}

// ── Main tab router ───────────────────────────────────────────────────────────

export default function JobsTab() {
  const user = useAuthStore((s) => s.user)
  const isClient = user?.accountType === 'CLIENT'
  const isWorker = user?.role === Role.WORKER && !isClient

  if (isClient) return <BookingsScreen />
  if (user?.role === Role.SALON) return <SalonJobsScreen />
  if (isWorker) return <WorkerJobsScreen />
  return <JobFeedScreen />
}

const styles = StyleSheet.create({
  splitHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  splitTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  splitSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 4,
    letterSpacing: 0.2,
  },
})
