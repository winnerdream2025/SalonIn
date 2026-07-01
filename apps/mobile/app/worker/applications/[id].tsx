import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Text, Button, useTheme } from '@salonin/ui'
import { messagesApi } from '@salonin/api-client'
import type { AppStatus } from '@salonin/types'

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:  { label: 'Pending Review', color: '#EF9F27', bg: 'rgba(239,159,39,0.12)',  icon: 'time-outline'          },
  VIEWED:   { label: 'Viewed',         color: '#378ADD', bg: 'rgba(55,138,221,0.12)',   icon: 'eye-outline'           },
  ACCEPTED: { label: 'Accepted!',      color: '#1D9E75', bg: 'rgba(29,158,117,0.12)',   icon: 'checkmark-circle-outline' },
  DECLINED: { label: 'Declined',       color: '#E24B4A', bg: 'rgba(226,75,74,0.12)',    icon: 'close-circle-outline'  },
}

export default function ApplicationDetailScreen() {
  const {
    jobId,
    jobTitle,
    salonName,
    salonPhoto,
    salonUserId,
    status,
    appliedAt,
    specialty,
    payStructure,
    jobType,
    city,
  } = useLocalSearchParams<{
    jobId: string
    jobTitle: string
    salonName: string
    salonPhoto?: string
    salonUserId?: string
    status: AppStatus
    appliedAt: string
    specialty?: string
    payStructure?: string
    jobType?: string
    city?: string
  }>()

  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [isMessaging, setIsMessaging] = useState(false)

  const cfg = STATUS_CONFIG[status as AppStatus] ?? STATUS_CONFIG.PENDING

  const formattedDate = appliedAt
    ? new Date(appliedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const handleViewJob = useCallback(() => {
    router.push(`/jobs/${jobId}` as never)
  }, [jobId])

  const handleMessage = useCallback(async () => {
    if (!salonUserId) {
      // Fetch salonUserId from salon profile if not passed
      Alert.alert('Cannot open chat', 'Salon contact info unavailable.')
      return
    }
    setIsMessaging(true)
    try {
      const conv = await messagesApi.createConversation(salonUserId)
      router.push({
        pathname: '/chat/[id]',
        params: { id: conv.id, name: salonName ?? 'Salon', otherUserId: salonUserId, otherPhotoUrl: salonPhoto ?? '' },
      } as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [salonUserId, salonName, salonPhoto])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3, marginLeft: 12 }}>
          Application
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 40 }} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
          <Ionicons name={cfg.icon as any} size={36} color={cfg.color} />
          <Text style={{ fontSize: 22, fontWeight: '900', color: cfg.color, marginTop: 8, letterSpacing: -0.5 }}>
            {cfg.label}
          </Text>
          {status === 'ACCEPTED' && (
            <Text style={{ fontSize: 13, color: cfg.color, opacity: 0.8, marginTop: 4, textAlign: 'center' }}>
              The salon accepted your application! Reach out to discuss next steps.
            </Text>
          )}
          {status === 'PENDING' && (
            <Text style={{ fontSize: 13, color: cfg.color, opacity: 0.8, marginTop: 4, textAlign: 'center' }}>
              Your application is waiting for review.
            </Text>
          )}
          {status === 'VIEWED' && (
            <Text style={{ fontSize: 13, color: cfg.color, opacity: 0.8, marginTop: 4, textAlign: 'center' }}>
              The salon has viewed your application.
            </Text>
          )}
        </View>

        {/* Job card */}
        <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <Text style={[styles.cardLabel, { color: theme.text.tertiary }]}>JOB</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={salonPhoto} name={salonName ?? 'Salon'} size="md" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text.primary }}>{jobTitle}</Text>
              <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>{salonName}</Text>
              {city ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="location-outline" size={12} color={theme.text.tertiary} />
                  <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{city}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Job meta chips */}
          <View style={styles.chipRow}>
            {specialty ? (
              <View style={[styles.chip, { backgroundColor: theme.bg.elevated }]}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{specialty}</Text>
              </View>
            ) : null}
            {jobType ? (
              <View style={[styles.chip, { backgroundColor: theme.bg.elevated }]}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{jobType.replace('_', ' ')}</Text>
              </View>
            ) : null}
            {payStructure ? (
              <View style={[styles.chip, { backgroundColor: theme.bg.elevated }]}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{payStructure}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Timeline */}
        <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <Text style={[styles.cardLabel, { color: theme.text.tertiary }]}>TIMELINE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="send-outline" size={15} color="#D85A30" />
            <Text style={{ fontSize: 14, color: theme.text.secondary }}>Applied {formattedDate}</Text>
          </View>
          {(status === 'VIEWED' || status === 'ACCEPTED' || status === 'DECLINED') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Ionicons name="eye-outline" size={15} color="#378ADD" />
              <Text style={{ fontSize: 14, color: theme.text.secondary }}>Application reviewed by salon</Text>
            </View>
          )}
          {status === 'ACCEPTED' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#1D9E75" />
              <Text style={{ fontSize: 14, color: '#1D9E75', fontWeight: '600' }}>Accepted by salon</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <Button variant="primary" size="lg" onPress={handleViewJob} fullWidth>
            View Job Post
          </Button>
          <TouchableOpacity
            onPress={() => void handleMessage()}
            disabled={isMessaging || !salonUserId}
            activeOpacity={0.8}
            style={[styles.secondaryBtn, { borderColor: theme.border.default, opacity: !salonUserId ? 0.4 : 1 }]}
          >
            {isMessaging ? (
              <ActivityIndicator size="small" color={theme.text.primary} />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color={theme.text.primary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary, marginLeft: 6 }}>
                  Message Salon
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
})
