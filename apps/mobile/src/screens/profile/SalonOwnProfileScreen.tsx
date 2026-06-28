import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text, Button, Skeleton, JobPostCard, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { Role } from '@salonin/types'
import { useMySalonProfile } from '../../hooks/useMySalonProfile'
import { authApi, salonsApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import { useStories } from '../../contexts/StoriesContext'
import * as Haptics from 'expo-haptics'

export default function SalonOwnProfileScreen() {
  const { salon, jobs, isLoading, error, refetch } = useMySalonProfile()
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const authUser  = useAuthStore((s) => s.user)
  const { myGroup, openCreator, openViewerForUser } = useStories()
  const { logout } = useAuth()
  const [hiringOverride, setHiringOverride] = useState<boolean | null>(null)

  const isHiring = hiringOverride ?? salon?.isHiring ?? false

  const handleToggleHiring = async () => {
    const newVal = !isHiring
    setHiringOverride(newVal)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await salonsApi.setHiringStatus(newVal)
    } catch {
      setHiringOverride(null)
      refetch()
    }
  }

  const handleSignOut = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, portfolio, and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount()
              clearAuth()
              router.replace('/(auth)/login')
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.')
            }
          },
        },
      ],
    )
  }

  const handlePressJob = (job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <SalonProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <View style={styles.errorState}>
          <Text variant="body" color="secondary" style={styles.errorText}>
            {error?.message ?? 'Salon profile not found'}
          </Text>
          <Button variant="secondary" onPress={refetch}>Try again</Button>
        </View>
      </SafeAreaView>
    )
  }

  const firstPhoto = salon.photoUrls[0] ?? null

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 52 + bottom + 24 }} showsVerticalScrollIndicator={false}>

        {/* ── Page title bar ── */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.titleSerif, { color: theme.text.primary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            My Salon
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/salon/edit' as never)}
            style={[styles.editPill, { backgroundColor: 'rgba(216,90,48,0.10)', borderColor: 'rgba(216,90,48,0.25)' }]}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={13} color="#D85A30" />
            <Text style={[styles.editPillText, { color: '#D85A30' }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cover + Logo overlap ── */}
        <View style={styles.cover}>
          {firstPhoto ? (
            <Image
              source={{ uri: firstPhoto }}
              style={[StyleSheet.absoluteFillObject, styles.coverBg]}
              blurRadius={14}
              resizeMode="cover"
            />
          ) : null}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: firstPhoto ? 'rgba(0,0,0,0.38)' : theme.bg.elevated }]} />

        </View>

        {/* Logo circle overlapping cover — tap ring to view/add story, tap camera badge to edit */}
        <View style={styles.logoArea}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            {/* Story ring — tappable */}
            <TouchableOpacity
              onPress={myGroup ? () => openViewerForUser(authUser?.id ?? '') : openCreator}
              activeOpacity={0.85}
              style={[
                styles.storyRing,
                { borderColor: myGroup ? '#D85A30' : theme.border.default, borderStyle: myGroup ? 'solid' : 'dashed' },
              ]}
            >
              <View style={[styles.logoCircle, { borderColor: firstPhoto ? 'rgba(255,255,255,0.7)' : theme.border.default, backgroundColor: theme.bg.elevated }]}>
                {firstPhoto ? (
                  <Image source={{ uri: firstPhoto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <Text style={[styles.logoInitial, { color: theme.text.secondary }]}>
                    {salon.name[0]?.toUpperCase() ?? 'S'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Story badge — top right */}
            <TouchableOpacity
              onPress={myGroup ? () => openViewerForUser(authUser?.id ?? '') : openCreator}
              style={[styles.storyBadge, { backgroundColor: myGroup ? '#D85A30' : '#555' }]}
            >
              <Ionicons name={myGroup ? 'play' : 'add'} size={10} color="#fff" />
            </TouchableOpacity>

            {/* Edit / camera badge — bottom right */}
            <TouchableOpacity
              onPress={() => router.push('/salon/edit' as never)}
              style={[styles.cameraBadge, { backgroundColor: theme.brand.primary }]}
            >
              <Ionicons name="camera" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Identity ── */}
        <View style={styles.identity}>
          <Text style={[styles.salonName, { color: theme.text.primary }]}>{salon.name}</Text>

          <View style={styles.pillsRow}>
            {salon.isVerified && (
              <View style={[styles.badge, { backgroundColor: 'rgba(29,158,117,0.15)' }]}>
                <Text style={{ fontSize: 12, color: theme.avail.now, fontWeight: '600' }}>✓ Verified</Text>
              </View>
            )}
            <Pressable
              onPress={handleToggleHiring}
              style={({ pressed }) => [
                styles.badge,
                {
                  backgroundColor: isHiring ? 'rgba(216,90,48,0.15)' : 'rgba(85,85,85,0.12)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <Text style={{ fontSize: 12, color: isHiring ? theme.brand.primary : theme.avail.none, fontWeight: '700' }}>
                {isHiring ? 'Hiring now' : 'Not hiring'}
              </Text>
            </Pressable>
          </View>

          {/* Follower stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCell}
              onPress={() => authUser && router.push(`/follow/followers?userId=${authUser.id}&name=${encodeURIComponent(salon.name)}` as never)}
            >
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{salon.followersCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Followers</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
            <TouchableOpacity
              style={styles.statCell}
              onPress={() => authUser && router.push(`/follow/following?userId=${authUser.id}&name=${encodeURIComponent(salon.name)}` as never)}
            >
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{salon.followingCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Specialties ── */}
        {salon.specialties.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.bg.elevated }]}>
            <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>SPECIALTIES</Text>
            <View style={styles.pillRow}>
              {salon.specialties.map((s) => (
                <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                  <Text variant="caption">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Open Positions ── */}
        <View style={styles.jobsSection}>
          <View style={styles.jobsHeader}>
            <Text variant="title">Open Positions</Text>
            <TouchableOpacity onPress={() => router.push('/jobs/create')}>
              <Text variant="caption" color="brand">+ Post job</Text>
            </TouchableOpacity>
          </View>

          {jobs.length === 0 ? (
            <View style={[styles.emptyJobs, { backgroundColor: theme.bg.elevated }]}>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                No open positions yet.
              </Text>
              <Button variant="primary" onPress={() => router.push('/jobs/create')}>
                Post your first job
              </Button>
            </View>
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.jobCardWrap}>
                  <JobPostCard job={item} onPress={() => handlePressJob(item)} />
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* ── SALON ── */}
        <Text style={[styles.menuSectionLabel, { color: theme.text.tertiary }]}>SALON</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/salon/edit' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="create-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Edit Salon</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/jobs/create')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="add-circle-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Post a Job</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/salon-staff' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(29,158,117,0.10)' }]}><Ionicons name="people-circle-outline" size={18} color="#1D9E75" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>My Team</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── BOOKINGS ── */}
        <Text style={[styles.menuSectionLabel, { color: theme.text.tertiary }]}>BOOKINGS</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/provider-bookings' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="calendar-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Manage Bookings</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/provider-calendar' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="calendar" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Calendar</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/analytics' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99,102,241,0.10)' }]}><Ionicons name="bar-chart-outline" size={18} color="#6366F1" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Analytics</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/clients' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(29,158,117,0.10)' }]}><Ionicons name="people-outline" size={18} color="#1D9E75" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Clients</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/waitlist' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="hourglass-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Waitlist</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── CONTENT ── */}
        <Text style={[styles.menuSectionLabel, { color: theme.text.tertiary }]}>CONTENT</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/posts/create' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="grid-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Create Post</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/gallery' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="images-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Gallery</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/highlights' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="bookmark-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Highlights</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── SETTINGS ── */}
        <Text style={[styles.menuSectionLabel, { color: theme.text.tertiary }]}>SETTINGS</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/manage-services' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="cut-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>My Services</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/intake-forms' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="document-text-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Intake Forms</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/provider-availability' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="time-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Booking Hours</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/provider-availability/blocked' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="ban-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Blocked Times</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/booking-settings' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}><Ionicons name="settings-outline" size={18} color="#D85A30" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Booking Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/stripe-connect' as never)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99,91,255,0.10)' }]}><Ionicons name="card-outline" size={18} color="#635BFF" /></View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Accept Payments</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Account ── */}
        <View style={[styles.menuCard, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
          {/* Account type row — non-tappable info row */}
          <View style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(55,138,221,0.10)' }]}>
              <Ionicons name="person-circle-outline" size={18} color="#378ADD" />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]} numberOfLines={1}>
              {authUser?.email ?? ''}
            </Text>
            <View style={[
              styles.rolePill,
              { backgroundColor: authUser?.role === Role.WORKER ? 'rgba(147,92,255,0.12)' : 'rgba(55,138,221,0.12)' },
            ]}>
              <Text style={[
                styles.rolePillText,
                { color: authUser?.role === Role.WORKER ? '#935CFF' : '#378ADD' },
              ]}>
                {authUser?.role === Role.WORKER ? 'Worker' : 'Salon Owner'}
              </Text>
            </View>
          </View>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity style={styles.menuRow} onPress={() => void Linking.openURL('https://salonin-production-77fc.up.railway.app/terms')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.input }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.text.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={14} color={theme.text.tertiary} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity style={styles.menuRow} onPress={() => void Linking.openURL('https://salonin-production-77fc.up.railway.app/privacy')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.input }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.text.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={theme.text.tertiary} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity style={styles.menuRow} onPress={() => void handleSignOut()} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.input }]}>
              <Ionicons name="log-out-outline" size={18} color={theme.text.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.secondary }]}>Sign Out</Text>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(220,38,38,0.08)' }]}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.menuLabel, { color: '#DC2626' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SalonProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ height: 160, backgroundColor: theme.bg.elevated }} />
      <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 8 }}>
        <Skeleton width={80} height={80} radius={40} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
        <Skeleton width={160} height={24} radius={6} />
        <Skeleton width={100} height={22} radius={11} />
      </View>
      <View style={{ marginHorizontal: 16, backgroundColor: theme.bg.elevated, borderRadius: 16, padding: 16, gap: 8, marginBottom: 10 }}>
        <Skeleton width={60} height={11} radius={5} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width={70} height={24} radius={12} />
          <Skeleton width={60} height={24} radius={12} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Skeleton width={140} height={20} radius={8} />
        <Skeleton width="100%" height={80} radius={16} />
        <Skeleton width="100%" height={80} radius={16} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 96 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  titleSerif: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 42,
    flexShrink: 0,
    flex: 1,
    minWidth: 0,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
  },
  editPillText: { fontSize: 13, fontWeight: '600' },

  cover: {
    height: 160,
    overflow: 'hidden',
    position: 'relative',
  },
  coverBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroEditBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroEditText: { fontSize: 15, fontWeight: '600' },

  logoArea: { alignItems: 'center', marginTop: -40, marginBottom: 4 },
  storyRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyBadge: {
    position: 'absolute',
    top: 2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: { fontSize: 32, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  identity: { alignItems: 'center', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 24, gap: 8 },
  salonName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 4 },
  statCell: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 0.5, height: 28 },

  section: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  jobsSection: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobCardWrap: { marginBottom: 8 },
  emptyJobs: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 16 },

  menuSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },

  menuCard: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  errorText: { textAlign: 'center' },
})
