import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Avatar, Text, Button, Skeleton, useTheme } from '@salonin/ui'
import { jobsApi, messagesApi } from '@salonin/api-client'
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
  DECLINED: '#E24B4A',
}

function daysDiff(date: Date | string): string {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
  if (diff <= 0) return 'Expired'
  if (diff === 1) return '1 day left'
  return `${diff} days left`
}

function postedAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const { job, isLoading, error } = useJobDetail(id ?? '')
  const { applications } = useMyApplications()

  const [isApplying, setIsApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [isMessaging, setIsMessaging] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to apply for this job.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push({ pathname: '/(auth)/login', params: { redirect: `/jobs/${id}` } } as never) },
      ])
      return
    }
    if (!id || !job) return
    setIsApplying(true)
    try {
      await jobsApi.apply(id)
      setApplied(true)
      const conv = await messagesApi.createConversation(job.salon.userId)
      await messagesApi.sendMessage(
        conv.id,
        `Hi! I applied to your "${job.title}" position. I'd love to discuss the opportunity.`,
      )
      router.push(
        `/chat/${conv.id}?name=${encodeURIComponent(job.salon.name)}` as never,
      )
    } catch {
      Alert.alert('Error', 'Could not submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }, [id, isGuest, job])

  const handleMessage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!job) return
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to message this salon.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push({ pathname: '/(auth)/login', params: { redirect: `/jobs/${id}` } } as never) },
      ])
      return
    }
    setIsMessaging(true)
    try {
      const conv = await messagesApi.createConversation(job.salon.userId)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(job.salon.name)}` as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [job, isGuest])

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
        <JobDetailSkeleton theme={theme} />
      </View>
    )
  }

  if (error || !job) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
        <View style={styles.centered}>
          <Text variant="body" color="secondary" style={styles.center}>
            {error?.message ?? 'Job not found'}
          </Text>
          <Button variant="ghost" onPress={() => router.back()}>Go back</Button>
        </View>
      </View>
    )
  }

  const expired = new Date(job.expiresAt).getTime() < Date.now()
  const daysStr = daysDiff(job.expiresAt)
  const expiryUrgent = !expired && Math.ceil((new Date(job.expiresAt).getTime() - Date.now()) / 86_400_000) <= 2

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base, paddingTop: top }]}>
      {/* ── Back button ── */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: theme.bg.elevated }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={[styles.backText, { color: theme.text.primary }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: !isOwnJob ? 96 + bottom : 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Salon header ── */}
        <TouchableOpacity
          style={[styles.salonCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}
          onPress={() => router.push(`/salon/${job.salonId}` as never)}
          activeOpacity={0.8}
        >
          <Avatar uri={job.salon.photoUrls[0] ?? null} name={job.salon.name} size="md" />
          <View style={styles.salonInfo}>
            <Text style={[styles.salonName, { color: theme.text.primary }]} numberOfLines={1}>
              {job.salon.name}
            </Text>
            <Text style={[styles.salonLoc, { color: theme.text.tertiary }]} numberOfLines={1}>
              📍 {job.salon.cityId.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.text.secondary }]}>›</Text>
        </TouchableOpacity>

        {/* ── Title + urgent ── */}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            {job.title}
          </Text>
          {job.isUrgent && !expired && (
            <View style={styles.urgentPill}>
              <View style={styles.urgentDot} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        {/* ── Specialty + type pills ── */}
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.pillText, { color: theme.text.secondary }]}>{job.specialty}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: 'rgba(55,138,221,0.12)' }]}>
            <Text style={[styles.pillText, { color: '#60B4FF' }]}>{EMP_LABELS[job.type] ?? job.type}</Text>
          </View>
        </View>

        {/* ── Key facts 2×2 grid ── */}
        <View style={[styles.factGrid, { borderColor: theme.border.default }]}>
          <View style={[styles.factCell, { borderColor: theme.border.default }]}>
            <Text style={[styles.factLabel, { color: theme.text.tertiary }]}>💰 Pay</Text>
            <Text style={[styles.factValue, { color: '#D85A30' }]} numberOfLines={1}>{job.payStructure}</Text>
          </View>
          <View style={[styles.factCell, { borderColor: theme.border.default }]}>
            <Text style={[styles.factLabel, { color: theme.text.tertiary }]}>📅 Posted</Text>
            <Text style={[styles.factValue, { color: theme.text.primary }]} numberOfLines={1}>{postedAgo(job.createdAt)}</Text>
          </View>
          <View style={[styles.factCell, { borderColor: theme.border.default }]}>
            <Text style={[styles.factLabel, { color: theme.text.tertiary }]}>⏱ Expires</Text>
            <Text style={[styles.factValue, { color: expiryUrgent ? theme.semantic.error.text : theme.text.primary }]} numberOfLines={1}>{daysStr}</Text>
          </View>
          <View style={[styles.factCell, { borderColor: theme.border.default }]}>
            <Text style={[styles.factLabel, { color: theme.text.tertiary }]}>👥 Applicants</Text>
            <Text style={[styles.factValue, { color: job._count.applications > 10 ? '#EF9F27' : theme.text.primary }]} numberOfLines={1}>{job._count.applications}</Text>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>Description</Text>
          <Text
            style={[styles.bodyText, { color: theme.text.secondary }]}
            numberOfLines={descExpanded ? undefined : 5}
          >
            {job.description}
          </Text>
          {job.description.length > 200 && (
            <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
              <Text style={[styles.showMore, { color: theme.brand.primary }]}>
                {descExpanded ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── About salon ── */}
        {job.salon.description ? (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>About the salon</Text>
            <Text style={[styles.bodyText, { color: theme.text.secondary }]}>{job.salon.description}</Text>
          </View>
        ) : null}

        {/* ── Applicants (salon owner view) ── */}
        {isOwnJob && (
          <View style={[styles.section, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
              Applicants{applicants.length > 0 ? ` (${applicants.length})` : ''}
            </Text>
            {loadingApplicants && <ActivityIndicator color={theme.brand.primary} />}
            {!loadingApplicants && applicants.length === 0 && (
              <Text style={[styles.bodyText, { color: theme.text.tertiary }]}>No applications yet.</Text>
            )}
            {applicants.map((app) => (
              <View
                key={app.id}
                style={[styles.applicantRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
              >
                <Avatar uri={app.worker.photoUrl} name={app.worker.name} size="sm" isVerified={app.worker.isVerified} />
                <View style={styles.applicantInfo}>
                  <Text style={[styles.applicantName, { color: theme.text.primary }]} numberOfLines={1}>
                    {app.worker.name}
                  </Text>
                  <Text style={[styles.applicantSub, { color: theme.text.secondary }]} numberOfLines={1}>
                    {app.worker.specialties.slice(0, 2).join(' · ')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[app.status] ?? theme.brand.primary) + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[app.status] ?? theme.brand.primary }]}>
                    {app.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom CTA (non-owners) ── */}
      {!isOwnJob && (
        <View style={[styles.ctaBar, {
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border.subtle,
          paddingBottom: Math.max(bottom, 16),
        }]}>
          {(isWorker || isGuest) && (
            <Pressable
              onPress={() => void handleApply()}
              disabled={isApplying || applied}
              style={({ pressed }) => [
                styles.applyBtn,
                (isApplying || applied) && styles.applyBtnDim,
                pressed && { opacity: 0.85 },
              ]}
            >
              {isApplying
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={[styles.applyBtnText, { color: theme.text.inverse }]}>{applied ? '✓ Applied' : 'Apply now'}</Text>
              }
            </Pressable>
          )}
          <Pressable
            onPress={() => void handleMessage()}
            disabled={isMessaging}
            style={({ pressed }) => [
              styles.messageBtn,
              { borderColor: theme.border.default },
              pressed && { opacity: 0.85 },
            ]}
          >
            {isMessaging
              ? <ActivityIndicator color={theme.brand.primary} />
              : <Text style={[styles.messageBtnText, { color: theme.text.primary }]}>Message salon</Text>
            }
          </Pressable>
        </View>
      )}
    </View>
  )
}

function JobDetailSkeleton({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]}>
      <View style={[styles.salonCard, { backgroundColor: theme.bg.card, borderColor: theme.border.default }]}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width={120} height={14} radius={5} />
          <Skeleton width={80} height={11} radius={5} />
        </View>
      </View>
      <View style={{ gap: 10, marginBottom: 16 }}>
        <Skeleton width="80%" height={28} radius={5} />
        <Skeleton width="60%" height={28} radius={5} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Skeleton width={90} height={28} radius={14} />
        <Skeleton width={80} height={28} radius={14} />
      </View>
      <View style={[styles.factGrid, { borderColor: theme.border.default, marginBottom: 16 }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.factCell, { borderColor: theme.border.default }]}>
            <Skeleton width={60} height={11} radius={5} />
            <Skeleton width={80} height={14} radius={5} />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  center: { textAlign: 'center' },
  backBtn: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backText: { fontSize: 15, fontWeight: '500' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
  },
  salonInfo: { flex: 1, minWidth: 0, gap: 2 },
  salonName: { fontSize: 15, fontWeight: '600' },
  salonLoc: { fontSize: 12 },
  chevron: { fontSize: 20 },
  titleBlock: { gap: 10 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,159,39,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(239,159,39,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  urgentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EF9F27' },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#EF9F27' },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '500' },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  factCell: {
    width: '50%',
    padding: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  factLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  factValue: { fontSize: 14, fontWeight: '700' },
  section: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bodyText: { fontSize: 14, lineHeight: 22 },
  showMore: { fontSize: 13, fontWeight: '600' },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  applicantInfo: { flex: 1, minWidth: 0, gap: 2 },
  applicantName: { fontSize: 14, fontWeight: '600' },
  applicantSub: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    gap: 10,
  },
  applyBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyBtnDim: { opacity: 0.6 },
  applyBtnText: { fontSize: 16, fontWeight: '700' },
  messageBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  messageBtnText: { fontSize: 15, fontWeight: '600' },
})
