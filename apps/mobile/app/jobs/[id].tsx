import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Avatar, Text, Button, useTheme } from '@salonin/ui'
import { jobsApi } from '@salonin/api-client'
import type { JobApplicationDetail } from '@salonin/types'
import { useAuthStore } from '../../src/store/authStore'
import { useJobDetail, useMyApplications } from '../../src/hooks/useJobDetail'

const EMP_LABELS: Record<string, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  TEMPORARY: 'Temporary',
  WEEKEND: 'Weekend',
  EMERGENCY: 'Emergency',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#EF9F27',
  VIEWED: '#378ADD',
  ACCEPTED: '#1D9E75',
  DECLINED: '#E74C3C',
}

function formatExpiry(date: Date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysDiff(date: Date) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
  return diff > 0 ? `${diff}d left` : 'Expired'
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useTheme()
  const user = useAuthStore((s) => s.user)

  const { job, isLoading, error } = useJobDetail(id ?? '')
  const { applications } = useMyApplications()

  const [isApplying, setIsApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applicants, setApplicants] = useState<JobApplicationDetail[]>([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)

  const isWorker = user?.role === 'WORKER'
  const isSalon = user?.role === 'SALON'
  const isGuest = !user
  const isOwnJob = isSalon && job?.salon.userId === user?.id

  useEffect(() => {
    if (isWorker && id && applications.length > 0) {
      setApplied(applications.some((a) => a.jobId === id))
    }
  }, [applications, isWorker, id])

  useEffect(() => {
    if (!isOwnJob || !id) return
    setLoadingApplicants(true)
    jobsApi
      .getApplicants(id)
      .then((data) => setApplicants(data))
      .catch(() => {})
      .finally(() => setLoadingApplicants(false))
  }, [isOwnJob, id])

  const handleApply = useCallback(async () => {
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to apply for this job.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
      ])
      return
    }
    if (!id) return
    setIsApplying(true)
    try {
      await jobsApi.apply(id)
      setApplied(true)
      Alert.alert('Applied!', 'Your application has been sent to the salon.')
    } catch {
      Alert.alert('Error', 'Could not submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }, [id, isGuest])

  const handleMessage = useCallback(() => {
    if (!job) return
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to message this salon.')
      return
    }
    router.push(`/chat/${job.salonId}`)
  }, [job, isGuest])

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.brand.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !job) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={styles.centered}>
          <Text variant="body" color="secondary" style={styles.center}>
            {error?.message ?? 'Job not found'}
          </Text>
          <Button variant="ghost" onPress={() => router.back()}>Go back</Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: theme.bg.elevated }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text variant="body">‹ Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Salon header */}
        <View style={styles.salonRow}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.bg.elevated }]}>
            <Avatar
              uri={job.salon.photoUrls[0] ?? null}
              name={job.salon.name}
              size="lg"
            />
          </View>
          <View style={styles.salonInfo}>
            <Text variant="body" style={{ fontWeight: '600', color: theme.text.primary }}>
              {job.salon.name}
            </Text>
            <Text variant="caption" color="secondary">{job.salon.cityId.toUpperCase()}</Text>
          </View>
        </View>

        {/* Title + urgent badge */}
        <View style={styles.titleRow}>
          <Text
            variant="heading"
            style={[styles.title, { color: theme.text.primary }]}
          >
            {job.title}
          </Text>
          {job.isUrgent && (
            <View style={[styles.urgentBadge, { backgroundColor: 'rgba(239,159,39,0.15)', borderColor: 'rgba(239,159,39,0.35)' }]}>
              <Text variant="caption" style={{ color: '#EF9F27', fontWeight: '700' }}>URGENT</Text>
            </View>
          )}
        </View>

        {/* Pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">{job.specialty}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">{EMP_LABELS[job.type] ?? job.type}</Text>
          </View>
        </View>

        {/* Info grid 2×2 */}
        <View style={[styles.infoGrid, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
          <View style={[styles.infoCell, { borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">Pay</Text>
            <Text variant="body" style={{ fontWeight: '600', color: theme.brand.primary }}>
              {job.payStructure}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">Duration</Text>
            <Text variant="body" style={{ fontWeight: '600', color: theme.text.primary }}>
              {daysDiff(job.expiresAt)}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">Type</Text>
            <Text variant="body" style={{ fontWeight: '600', color: theme.text.primary }}>
              {EMP_LABELS[job.type] ?? job.type}
            </Text>
          </View>
          <View style={[styles.infoCell, { borderColor: theme.border.default }]}>
            <Text variant="caption" color="secondary">Applicants</Text>
            <Text variant="body" style={{ fontWeight: '600', color: theme.text.primary }}>
              {job._count.applications}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>DESCRIPTION</Text>
          <Text variant="body" style={{ color: theme.text.primary, lineHeight: 22 }}>
            {job.description}
          </Text>
        </View>

        {/* Salon description */}
        {job.salon.description ? (
          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionLabel}>ABOUT THE SALON</Text>
            <Text variant="body" style={{ color: theme.text.secondary, lineHeight: 22 }}>
              {job.salon.description}
            </Text>
          </View>
        ) : null}

        {/* Expiry */}
        <Text variant="caption" color="secondary" style={styles.expiry}>
          Expires {formatExpiry(job.expiresAt)}
        </Text>

        {/* SALON: applicants list */}
        {isOwnJob && (
          <View style={styles.section}>
            <Text variant="label" color="secondary" style={styles.sectionLabel}>
              APPLICANTS ({applicants.length})
            </Text>
            {loadingApplicants && (
              <ActivityIndicator color={theme.brand.primary} style={{ marginTop: 12 }} />
            )}
            {!loadingApplicants && applicants.length === 0 && (
              <Text variant="body" color="secondary">No applications yet.</Text>
            )}
            {applicants.map((app) => (
              <View
                key={app.id}
                style={[styles.applicantRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
              >
                <View style={styles.applicantCircle}>
                  <Avatar uri={app.worker.photoUrl} name={app.worker.name} size="md" />
                </View>
                <View style={styles.applicantInfo}>
                  <Text variant="body" style={{ fontWeight: '600', color: theme.text.primary }}>
                    {app.worker.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {app.worker.specialties.slice(0, 2).join(' · ')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_COLORS[app.status] ?? theme.brand.primary) + '22' },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: STATUS_COLORS[app.status] ?? theme.brand.primary, fontWeight: '600' }}
                  >
                    {app.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      {!isOwnJob && (
        <View style={[styles.actions, { backgroundColor: theme.bg.base, borderTopColor: theme.border.default }]}>
          {(isWorker || isGuest) && (
            <Button
              variant="primary"
              fullWidth
              loading={isApplying}
              disabled={applied}
              onPress={handleApply}
            >
              {applied ? '✓ Applied' : 'Apply now'}
            </Button>
          )}
          <Button variant="secondary" fullWidth onPress={handleMessage}>
            Message salon
          </Button>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  center: { textAlign: 'center' },
  backBtn: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 0 },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 8 },
  avatarCircle: { borderRadius: 50, overflow: 'hidden' },
  salonInfo: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  urgentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  infoCell: {
    width: '50%',
    padding: 16,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  section: { marginBottom: 24 },
  sectionLabel: { letterSpacing: 0.8, marginBottom: 10 },
  expiry: { marginBottom: 20, textAlign: 'center' },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  applicantCircle: { borderRadius: 50, overflow: 'hidden' },
  applicantInfo: { flex: 1, gap: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
