import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text, Button, Skeleton, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'
import type { SalonStaffRecord } from '@salonin/api-client'

const STATUS_COLOR: Record<string, string> = {
  INVITED: '#F59E0B',
  ACTIVE: '#10B981',
  DECLINED: '#6B7280',
  REMOVED: '#EF4444',
}

const STATUS_LABEL: Record<string, string> = {
  INVITED: 'Pending',
  ACTIVE: 'Active',
  DECLINED: 'Declined',
  REMOVED: 'Removed',
}

export default function SalonStaffScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [staff, setStaff] = useState<SalonStaffRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setStaff(await salonsApi.getStaff())
    } catch {
      Alert.alert('Error', 'Could not load team members.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleRemove = useCallback((record: SalonStaffRecord) => {
    Alert.alert(
      'Remove from team',
      `Remove ${record.worker?.name ?? 'this worker'} from your salon?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await salonsApi.removeStaff(record.id)
              setStaff((prev) => prev.filter((s) => s.id !== record.id))
            } catch {
              Alert.alert('Error', 'Could not remove staff member.')
            }
          },
        },
      ],
    )
  }, [])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]}>My Team</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.content}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonRow, { backgroundColor: theme.bg.elevated, overflow: 'hidden' }]}>
              <Skeleton />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}>
          {staff.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
              <Ionicons name="people-outline" size={40} color={theme.text.tertiary} />
              <Text variant="body" color="secondary" style={{ marginTop: 12, textAlign: 'center' }}>
                No team members yet.
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 6, textAlign: 'center' }}>
                Browse workers and tap "Invite to Salon" on their profile.
              </Text>
              <View style={{ marginTop: 16 }}>
                <Button variant="primary" onPress={() => router.push('/(tabs)' as never)}>
                  Find Workers
                </Button>
              </View>
            </View>
          ) : (
            staff.map((record) => {
              const w = record.worker
              const statusColor = STATUS_COLOR[record.status] ?? '#6B7280'
              return (
                <View
                  key={record.id}
                  style={[styles.card, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                >
                  <View style={styles.cardRow}>
                    {w?.photoUrl ? (
                      <Image source={{ uri: w.photoUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.bg.input }]}>
                        <Text style={{ fontSize: 18, color: theme.text.secondary }}>
                          {w?.name[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
                        {w?.name ?? 'Worker'}
                      </Text>
                      {w?.city ? (
                        <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
                          {w.city}{w.state ? `, ${w.state}` : ''}
                        </Text>
                      ) : null}
                      <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                          {STATUS_LABEL[record.status] ?? record.status}
                        </Text>
                      </View>
                    </View>
                    {record.status !== 'REMOVED' && (
                      <TouchableOpacity
                        onPress={() => handleRemove(record)}
                        style={styles.removeBtn}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  skeletonRow: { height: 80, borderRadius: 14 },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  removeBtn: { padding: 8 },
})
