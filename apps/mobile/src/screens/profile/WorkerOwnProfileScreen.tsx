import React, { useState, useCallback } from 'react'
import {
  View, ScrollView, Image, TouchableOpacity, Pressable,
  StyleSheet, Alert, Modal, ActivityIndicator, Linking, Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text, AvailabilityBadge, PortfolioGrid, Skeleton, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { PortfolioItem } from '@salonin/types'
import { Availability } from '@salonin/types'
import { formatExperience } from '@salonin/utils'
import { useMyWorkerProfile } from '../../hooks/useWorkerProfile'
import { useMyApplications } from '../../hooks/useJobDetail'
import { authApi, workersApi, verifyApi } from '@salonin/api-client'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import * as Haptics from 'expo-haptics'
import { useMediaUpload } from '../../hooks/useMediaUpload'

export default function WorkerOwnProfileScreen() {
  const { profile, isLoading, refetch } = useMyWorkerProfile()
  const { applications } = useMyApplications()
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()

  const AVAIL_OPTIONS: Array<{ value: Availability; label: string; color: string }> = [
    { value: Availability.NOW,           label: 'Available now',   color: theme.avail.now    },
    { value: Availability.TODAY,         label: 'Available today', color: theme.avail.today  },
    { value: Availability.WEEKEND,       label: 'This weekend',    color: theme.avail.weekend },
    { value: Availability.NOT_AVAILABLE, label: 'Not available',   color: theme.avail.none   },
  ]

  const clearAuth  = useAuthStore((s) => s.clearAuth)
  const { logout } = useAuth()
  const [showAvailSheet, setShowAvailSheet]   = useState(false)
  const [currentAvail,   setCurrentAvail]     = useState<Availability | null>(null)
  const [optimisticPhoto, setOptimisticPhoto] = useState<string | null>(null)
  const [bioExpanded,    setBioExpanded]       = useState(false)
  const [isVerifying,    setIsVerifying]       = useState(false)

  const { pickAndUpload, isUploading } = useMediaUpload({ folder: 'avatars', allowsEditing: true })

  const handlePickPhoto = useCallback(async () => {
    const url = await pickAndUpload()
    if (!url) return
    setOptimisticPhoto(url)
    try {
      await workersApi.updateProfile({ photoUrl: url })
    } catch {
      setOptimisticPhoto(null)
      refetch()
    }
  }, [pickAndUpload, refetch])

  const availability = currentAvail ?? profile?.availability ?? Availability.NOT_AVAILABLE

  const handleAvailChange = async (value: Availability) => {
    setCurrentAvail(value)
    setShowAvailSheet(false)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await workersApi.updateAvailability({ availability: value })
    } catch {
      setCurrentAvail(null)
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

  const handlePressItem = (item: PortfolioItem) => {
    router.push(`/worker/portfolio-view?url=${encodeURIComponent(item.mediaUrl)}` as never)
  }

  const handleGetVerified = async () => {
    setIsVerifying(true)
    try {
      const { url } = await verifyApi.createIdentitySession()
      await Linking.openURL(url)
    } catch {
      Alert.alert('Verification unavailable', 'Could not start verification. Please try again later.')
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <ProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
        <View style={styles.emptyState}>
          <Text variant="body" color="secondary">Profile not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const photoUrl     = optimisticPhoto ?? profile.photoUrl ?? null
  const firstInitial = (profile.name?.[0] ?? 'W').toUpperCase()
  const hasBio       = !!profile.bio
  const hasSpecialties = profile.specialties.length > 0

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 52 + bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Page title bar ─────────────────────────────── */}
        <View style={styles.titleBar}>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]} numberOfLines={1}>Profile</Text>
          <TouchableOpacity
            onPress={() => router.push('/worker/edit')}
            style={[styles.editPill, { backgroundColor: 'rgba(216,90,48,0.10)' }]}
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={14} color="#D85A30" />
            <Text style={styles.editPillText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cover strip ────────────────────────────────── */}
        <View style={[styles.cover, { backgroundColor: theme.bg.elevated }]} />

        {/* ── Hero section ───────────────────────────────── */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            onPress={() => void handlePickPhoto()}
            disabled={isUploading}
            activeOpacity={0.85}
            style={styles.avatarWrap}
          >
            <View style={[styles.avatarCircle, { borderColor: '#D85A30', backgroundColor: theme.bg.elevated }]}>
              {isUploading ? (
                <ActivityIndicator color="#D85A30" />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{firstInitial}</Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera-outline" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: theme.text.primary }]} numberOfLines={1}>
            {profile.name}
          </Text>

          {profile.isVerified ? (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={13} color="#378ADD" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => void handleGetVerified()}
              disabled={isVerifying}
              style={styles.verifyBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="shield-outline" size={13} color="#D85A30" />
              <Text style={styles.verifyBtnText}>
                {isVerifying ? 'Opening…' : 'Get Verified'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.profileSpec, { color: theme.text.secondary }]} numberOfLines={1}>
            {profile.specialties[0] ?? 'Beauty Professional'}
          </Text>

          <Pressable
            onPress={() => setShowAvailSheet(true)}
            style={({ pressed }) => [{ marginTop: 8, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <AvailabilityBadge status={availability} />
          </Pressable>
        </View>

        {/* ── Stats card ─────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{applications.length}</Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Applied</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{formatExperience(profile.experienceYears)}</Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Experience</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#EF9F27' }]}>
                {profile.rating != null ? profile.rating.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Rating</Text>
            </View>
          </View>
        </View>

        {/* ── About + Specialties merged card ─────────────── */}
        {(hasBio || hasSpecialties) ? (
          <View style={[styles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
            {hasBio && (
              <>
                <Text style={[styles.cardLabel, { color: theme.text.tertiary }]}>About</Text>
                <Text style={[styles.bioText, { color: theme.text.secondary }]} numberOfLines={bioExpanded ? undefined : 3}>
                  {profile.bio}
                </Text>
                {(profile.bio?.length ?? 0) > 120 && (
                  <Pressable onPress={() => setBioExpanded((e) => !e)} style={{ marginTop: 2 }}>
                    <Text style={styles.readMoreText}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
                  </Pressable>
                )}
              </>
            )}
            {hasBio && hasSpecialties && (
              <View style={[styles.inlineDivider, { backgroundColor: theme.border.subtle }]} />
            )}
            {hasSpecialties && (
              <>
                <Text style={[styles.cardLabel, { color: theme.text.tertiary }]}>Specialties</Text>
                <View style={styles.chipsWrap}>
                  {profile.specialties.map((s) => (
                    <View key={s} style={styles.specialtyChip}>
                      <Text style={styles.specialtyChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/worker/edit')}
            activeOpacity={0.7}
            style={[styles.card, styles.emptyBioCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
          >
            <View style={[styles.emptyBioIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
              <Ionicons name="pencil-outline" size={18} color="#D85A30" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyBioTitle, { color: theme.text.primary }]}>Add a bio</Text>
              <Text style={[styles.emptyBioSub, { color: theme.text.tertiary }]}>
                Tell salons what makes you stand out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}

        {/* ── Portfolio ────────────────────────────────────── */}
        <View style={styles.portfolioWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Portfolio</Text>
            <TouchableOpacity
              onPress={() => router.push('/worker/portfolio')}
              style={styles.addBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={15} color="#D85A30" />
              <Text style={styles.addBtnText}>Add photos</Text>
            </TouchableOpacity>
          </View>
          <PortfolioGrid items={profile.portfolioItems} onPressItem={handlePressItem} isLoading={false} />
        </View>

        {/* ── Profile actions ──────────────────────────────── */}
        <View style={[styles.menuGroup, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/worker/edit')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
              <Ionicons name="create-outline" size={18} color="#D85A30" />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/worker/applications' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(216,90,48,0.10)' }]}>
              <Ionicons name="briefcase-outline" size={18} color="#D85A30" />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>My Applications</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Account ─────────────────────────────────────── */}
        <View style={[styles.menuGroup, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => void Linking.openURL('https://salonin-production-77fc.up.railway.app/terms')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.elevated }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.text.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Terms of Service</Text>
            <Ionicons name="open-outline" size={13} color={theme.text.tertiary} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => void Linking.openURL('https://salonin-production-77fc.up.railway.app/privacy')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.elevated }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.text.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={13} color={theme.text.tertiary} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border.subtle }]} />

          <TouchableOpacity style={styles.menuRow} onPress={() => void handleSignOut()} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme.bg.elevated }]}>
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

      {/* ── Availability bottom sheet ─────────────────────── */}
      <Modal visible={showAvailSheet} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowAvailSheet(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border.default }]} />
            <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>Set availability</Text>
            {AVAIL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleAvailChange(opt.value)}
                style={({ pressed }) => [
                  styles.sheetOption,
                  { backgroundColor: pressed ? theme.bg.elevated : 'transparent' },
                ]}
              >
                <View style={[styles.sheetDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.sheetOptionText, { color: theme.text.primary }]}>{opt.label}</Text>
                {availability === opt.value && (
                  <Ionicons name="checkmark" size={18} color="#D85A30" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      {/* Title bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Skeleton width={90} height={28} radius={6} />
        <Skeleton width={68} height={32} radius={16} />
      </View>
      {/* Cover + hero */}
      <View style={{ height: 120, backgroundColor: theme.bg.elevated }} />
      <View style={{ alignItems: 'center', marginTop: -46, paddingBottom: 16, gap: 8 }}>
        <Skeleton width={92} height={92} radius={46} />
        <Skeleton width={130} height={18} radius={6} />
        <Skeleton width={100} height={13} radius={5} />
        <Skeleton width={110} height={26} radius={13} />
      </View>
      {/* Stats card */}
      <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.bg.card, borderRadius: 20, overflow: 'hidden', padding: 16 }}>
        <View style={{ flexDirection: 'row' }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Skeleton width={40} height={22} radius={5} />
              <Skeleton width={56} height={11} radius={4} />
            </View>
          ))}
        </View>
      </View>
      {/* Bio + specialties skeleton */}
      <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.bg.card, borderRadius: 20, padding: 16, gap: 8 }}>
        <Skeleton width={50} height={10} radius={4} />
        <Skeleton width="100%" height={13} radius={5} />
        <Skeleton width="80%"  height={13} radius={5} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border.subtle, marginVertical: 4 }} />
        <Skeleton width={80} height={10} radius={4} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width={80} height={26} radius={13} />
          <Skeleton width={70} height={26} radius={13} />
          <Skeleton width={60} height={26} radius={13} />
        </View>
      </View>
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:     { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Title bar
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5,
    flexShrink: 1,
    minWidth: 0,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D85A30',
  },

  // Cover strip
  cover: {
    height: 120,
  },

  // Hero section
  heroSection: {
    marginTop: -46,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 3,
  },

  // Avatar
  avatarWrap:   { position: 'relative', flexShrink: 0, marginBottom: 6 },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D85A30',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Identity text
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#378ADD',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216,90,48,0.35)',
    backgroundColor: 'rgba(216,90,48,0.08)',
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D85A30',
  },
  profileSpec: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },

  // Generic card
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  // Inline divider inside merged card
  inlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },

  // Card label
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Bio
  bioText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D85A30',
  },

  // Empty bio prompt
  emptyBioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  emptyBioIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyBioTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBioSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },

  // Specialty chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.09)',
  },
  specialtyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#147A5A',
  },

  // Portfolio
  portfolioWrap:    { marginBottom: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D85A30',
  },

  // Menu group
  menuGroup: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
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
    flexShrink: 0,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  pendingBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bottom sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  sheetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sheetOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
})
