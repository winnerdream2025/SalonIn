import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, Skeleton, JobPostCard, useTheme } from '@salonin/ui'
import type { Theme } from '@salonin/ui'
import type { JobPostCardData } from '@salonin/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSalonProfile } from '../../src/hooks/useSalonProfile'
import { useAuthStore } from '../../src/store/authStore'
import { useAuthGateStore } from '../../src/store/authGateStore'
import { messagesApi } from '@salonin/api-client'
import { Role } from '@salonin/types'
import { useCanReview } from '../../src/hooks/useReviews'
import { useStories } from '../../src/contexts/StoriesContext'
import { useProviderServices } from '../../src/services/booking/booking.hooks'
import { ServiceCard, ServiceCardSkeleton } from '../../src/components/cards/ServiceCard'

export default function SalonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { salon, jobs, isLoading, error, refetch } = useSalonProfile(id)
  const currentUser = useAuthStore((s) => s.user)
  const showGate = useAuthGateStore((s) => s.show)
  const { theme } = useTheme()
  const { storyMap, openViewerForUser } = useStories()

  const { bottom } = useSafeAreaInsets()

  const isOwner = Boolean(
    currentUser &&
    salon &&
    currentUser.role === Role.SALON &&
    salon.user?.id === currentUser.id
  )
  const isSalon = currentUser?.role === Role.SALON

  const [isMessaging, setIsMessaging] = useState(false)
  const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'portfolio' | 'info'>('services')
  const [serviceSearch, setServiceSearch] = useState('')

  const handleBookNow = useCallback(() => {
    if (!currentUser) {
      showGate('/booking/services', 'Sign in to book an appointment')
      return
    }
    if (!salon) return
    router.push({
      pathname: '/booking/services',
      params: { providerId: salon.id, providerType: 'salon', providerName: salon.name },
    } as never)
  }, [currentUser, salon, showGate])

  const handleBookService = useCallback((svc: { id: string; name: string; price: number; currency: string; duration: number }) => {
    if (!currentUser) {
      showGate('/booking/services', 'Sign in to book an appointment')
      return
    }
    if (!salon) return
    router.push({
      pathname: '/booking/slots',
      params: {
        providerId: salon.id,
        providerType: 'salon',
        providerName: salon.name,
        serviceId: svc.id,
        serviceName: svc.name,
        servicePrice: String(svc.price),
        serviceCurrency: svc.currency,
        serviceDuration: String(svc.duration),
      },
    } as never)
  }, [currentUser, salon, showGate])
  const { canReview, existingReview } = useCanReview(
    !isOwner && currentUser ? salon?.userId : undefined
  )

  const handleMessage = useCallback(async () => {
    if (!currentUser) {
      showGate('/(tabs)/messages', 'Sign in to message this salon')
      return
    }
    if (!salon) return
    setIsMessaging(true)
    try {
      const conv = await messagesApi.createConversation(salon.userId)
      router.push(`/chat/${conv.id}?name=${encodeURIComponent(salon.name)}` as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [currentUser, salon, showGate])

  const handlePressJob = (job: JobPostCardData) => {
    router.push(`/jobs/${job.id}`)
  }

  const { services: salonServices, isLoading: servicesLoading } = useProviderServices(
    salon?.id ?? null,
    'salon',
  )

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return salonServices
    const q = serviceSearch.toLowerCase()
    return salonServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    )
  }, [salonServices, serviceSearch])

  const [collapsedSalonCategories, setCollapsedSalonCategories] = useState<Set<string>>(new Set())

  const groupedFilteredServices = useMemo(() => {
    if (filteredServices.length === 0) return []
    const map = new Map<string, typeof filteredServices>()
    for (const s of filteredServices) {
      const key = s.category
        ? s.category.charAt(0).toUpperCase() + s.category.slice(1).toLowerCase()
        : 'Other'
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [filteredServices])

  const toggleSalonCategory = useCallback((cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCollapsedSalonCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const handleGetDirections = useCallback(() => {
    if (!salon) return
    const query = encodeURIComponent(`${salon.name}${salon.city ? `, ${salon.city}` : ''}${salon.state ? `, ${salon.state}` : ''}`)
    const url = `https://maps.apple.com/?q=${query}`
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    })
  }, [salon])

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <SalonProfileSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  if (error || !salon) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]}>
        <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.default }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 60 }}>
            <Text variant="body" color="brand">‹ Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.errorState}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text variant="title" style={{ textAlign: 'center' }}>Something went wrong</Text>
          <Text variant="body" color="secondary" style={styles.errorText}>
            {error?.message ?? 'Salon not found'}
          </Text>
          <Button variant="secondary" onPress={refetch}>Try again</Button>
        </View>
      </SafeAreaView>
    )
  }

  const firstPhoto = salon.photoUrls[0] ?? null
  const salonStory = storyMap.get(salon.userId)
  const hasSalonStory = salonStory?.hasStory ?? false
  const salonStoryUnseen = salonStory?.hasUnseen ?? false
  const photoCount = salon.photoUrls.length

  const TABS = [
    { id: 'services' as const, label: 'SERVICES' },
    { id: 'reviews' as const, label: 'REVIEWS' },
    { id: 'portfolio' as const, label: 'PORTFOLIO' },
    { id: 'info' as const, label: 'INFO' },
  ]

  const reviewCount = salon.reviewCount ?? 0
  const avgRating = salon.rating ?? 0
  const isTopPro = avgRating >= 4.8 && reviewCount >= 20

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + bottom }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        {/* ── 1. Full-width hero ── */}
        <View style={styles.hero}>
          {firstPhoto ? (
            <>
              <Image source={{ uri: firstPhoto }} style={styles.heroImage} resizeMode="cover" />
              {/* Back button overlay */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.heroBack}
                activeOpacity={0.85}
              >
                <View style={styles.heroBackCircle}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              {/* Story play button */}
              {hasSalonStory && (
                <TouchableOpacity
                  onPress={() => openViewerForUser(salon.userId)}
                  style={[styles.storyBtn, { borderColor: salonStoryUnseen ? '#D85A30' : '#888' }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={salonStoryUnseen ? 'play-circle' : 'play-circle-outline'} size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {/* Photo count */}
              {photoCount > 1 && (
                <View style={styles.photoCount}>
                  <Ionicons name="images-outline" size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 3 }}>
                    {photoCount}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.heroBack}
                activeOpacity={0.85}
              >
                <View style={[styles.heroBackCircle, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                  <Ionicons name="chevron-back" size={20} color={theme.text.primary} />
                </View>
              </TouchableOpacity>
              <View style={[styles.heroPlaceholder, { backgroundColor: theme.bg.elevated }]}>
                <Text style={{ fontSize: 56, fontWeight: '800', color: theme.text.tertiary }}>
                  {salon.name[0]?.toUpperCase() ?? 'S'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── 2. Identity + StyleSeat stats bar ── */}
        <View style={[styles.identity, { backgroundColor: theme.bg.base }]}>
          {/* Name + badges */}
          <View style={styles.nameRow}>
            <Text variant="heading" style={[styles.salonName, { color: theme.text.primary }]}>{salon.name}</Text>
            <View style={styles.badgeRow}>
              {salon.isVerified && (
                <View style={[styles.badge, { backgroundColor: 'rgba(29,158,117,0.15)' }]}>
                  <Text style={{ fontSize: 11, color: '#1D9E75', fontWeight: '700' }}>✓ Verified</Text>
                </View>
              )}
              {isTopPro && (
                <View style={[styles.badge, { backgroundColor: 'rgba(216,90,48,0.15)' }]}>
                  <Text style={{ fontSize: 11, color: '#D85A30', fontWeight: '700' }}>⭐ Top Pro</Text>
                </View>
              )}
              {salon.isHiring && (
                <View style={[styles.badge, { backgroundColor: 'rgba(21,101,192,0.15)' }]}>
                  <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '700' }}>Hiring</Text>
                </View>
              )}
            </View>
          </View>
          {/* Specialties inline */}
          {salon.specialties.length > 0 && (
            <Text style={[styles.specialtyLine, { color: theme.text.secondary }]}>
              {salon.specialties.slice(0, 3).join(' · ')}
            </Text>
          )}
          {/* StyleSeat-style stats bar */}
          <View style={[styles.statsBar, { borderColor: theme.border.subtle }]}>
            {avgRating > 0 && (
              <>
                <TouchableOpacity
                  onPress={() => setActiveTab('reviews')}
                  style={styles.statCell}
                  activeOpacity={0.75}
                >
                  <Text style={styles.statValue}>★ {avgRating.toFixed(1)}</Text>
                  <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>
                    {reviewCount > 0 ? `(${reviewCount})` : 'Rating'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
              </>
            )}
            {reviewCount > 0 && (
              <>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{reviewCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Reviews</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border.subtle }]} />
              </>
            )}
            {(salon.city || salon.state) && (
              <TouchableOpacity
                onPress={handleGetDirections}
                style={styles.statCell}
                activeOpacity={0.75}
              >
                <Text style={styles.statValue}>
                  {[salon.city, salon.state].filter(Boolean).join(', ')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Location</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── 4 StyleSeat action buttons ── */}
          <View style={styles.actionRow}>
            {!isOwner && (
              <TouchableOpacity
                onPress={() => void handleMessage()}
                disabled={isMessaging}
                style={[styles.actionBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
                activeOpacity={0.75}
              >
                {isMessaging
                  ? <ActivityIndicator size="small" color={theme.brand.primary} />
                  : <Ionicons name="chatbubble-outline" size={20} color={theme.text.secondary} />
                }
                <Text style={[styles.actionLabel, { color: theme.text.secondary }]}>Message</Text>
              </TouchableOpacity>
            )}
            {(salon.city || salon.state) && (
              <TouchableOpacity
                onPress={handleGetDirections}
                style={[styles.actionBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
                activeOpacity={0.75}
              >
                <Ionicons name="navigate-outline" size={20} color={theme.text.secondary} />
                <Text style={[styles.actionLabel, { color: theme.text.secondary }]}>Directions</Text>
              </TouchableOpacity>
            )}
            {avgRating > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('reviews')
                  router.push(`/review/list?userId=${salon.userId}&userName=${encodeURIComponent(salon.name)}&rating=${salon.rating}&reviewCount=${salon.reviewCount}` as never)
                }}
                style={[styles.actionBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
                activeOpacity={0.75}
              >
                <Ionicons name="star-outline" size={20} color={theme.text.secondary} />
                <Text style={[styles.actionLabel, { color: theme.text.secondary }]}>Reviews</Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                onPress={() => router.push('/salon/edit' as never)}
                style={[styles.actionBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={20} color={theme.text.secondary} />
                <Text style={[styles.actionLabel, { color: theme.text.secondary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 3. Sticky Booksy-style tabs (index 2 = stickyHeaderIndices) ── */}
        <View style={[styles.tabs, { backgroundColor: theme.bg.base, borderBottomColor: theme.border.subtle }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabItem}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.tabLabel,
                { color: activeTab === tab.id ? '#D85A30' : theme.text.tertiary },
              ]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab: SERVICES ── */}
        {activeTab === 'services' && (
          <View style={styles.tabContent}>
            {/* Search within services */}
            {salonServices.length > 4 && (
              <View style={[styles.serviceSearch, { backgroundColor: theme.bg.input, borderColor: theme.border.subtle }]}>
                <Ionicons name="search-outline" size={16} color={theme.text.tertiary} />
                <TextInput
                  value={serviceSearch}
                  onChangeText={setServiceSearch}
                  placeholder="Search services…"
                  placeholderTextColor={theme.text.tertiary}
                  style={[styles.serviceSearchInput, { color: theme.text.primary }]}
                />
                {serviceSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setServiceSearch('')}>
                    <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {servicesLoading ? (
              <>
                <ServiceCardSkeleton theme={theme} />
                <ServiceCardSkeleton theme={theme} />
                <ServiceCardSkeleton theme={theme} />
              </>
            ) : filteredServices.length === 0 ? (
              <Text style={[styles.emptyMsg, { color: theme.text.tertiary }]}>
                {serviceSearch ? 'No services match your search' : 'No services listed yet'}
              </Text>
            ) : groupedFilteredServices.length > 1 ? (
              // Multiple categories → collapsible grouped sections
              groupedFilteredServices.map(([cat, svcs]) => {
                const expanded = !collapsedSalonCategories.has(cat)
                return (
                  <View key={cat} style={{ marginBottom: 6 }}>
                    <TouchableOpacity
                      onPress={() => toggleSalonCategory(cat)}
                      activeOpacity={0.75}
                      style={[styles.svcCategoryHeader, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{cat}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{svcs.length}</Text>
                        <Text style={{ fontSize: 14, color: theme.text.tertiary, fontWeight: '600' }}>{expanded ? '∧' : '∨'}</Text>
                      </View>
                    </TouchableOpacity>
                    {expanded && svcs.map((svc) => (
                      <ServiceCard
                        key={svc.id}
                        service={svc}
                        mode={salon.acceptsBookings && !isOwner && !isSalon ? 'booking' : 'preview'}
                        onPress={salon.acceptsBookings && !isOwner && !isSalon ? () => handleBookService(svc) : undefined}
                        onBook={salon.acceptsBookings && !isOwner && !isSalon ? () => handleBookService(svc) : undefined}
                        theme={theme}
                      />
                    ))}
                  </View>
                )
              })
            ) : (
              // Single category or all uncategorized → flat list
              filteredServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  mode={salon.acceptsBookings && !isOwner && !isSalon ? 'booking' : 'preview'}
                  onPress={salon.acceptsBookings && !isOwner && !isSalon ? () => handleBookService(svc) : undefined}
                  onBook={salon.acceptsBookings && !isOwner && !isSalon ? () => handleBookService(svc) : undefined}
                  theme={theme}
                />
              ))
            )}
          </View>
        )}

        {/* ── Tab: REVIEWS ── */}
        {activeTab === 'reviews' && (
          <View style={styles.tabContent}>
            {avgRating > 0 && (
              <TouchableOpacity
                onPress={() => router.push(`/review/list?userId=${salon.userId}&userName=${encodeURIComponent(salon.name)}&rating=${salon.rating}&reviewCount=${salon.reviewCount}` as never)}
                style={[styles.reviewSummary, { backgroundColor: theme.bg.elevated }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.reviewRatingBig, { color: theme.text.primary }]}>
                  {avgRating.toFixed(1)}
                </Text>
                <View>
                  <Text style={{ fontSize: 20 }}>
                    {'★'.repeat(Math.min(5, Math.round(avgRating)))}{'☆'.repeat(Math.max(0, 5 - Math.round(avgRating)))}
                  </Text>
                  <Text style={{ color: theme.text.tertiary, fontSize: 13, marginTop: 2 }}>
                    {reviewCount} reviews — tap to see all →
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {canReview && !existingReview && (
              <TouchableOpacity
                onPress={() => router.push(`/review/leave?subjectId=${salon.userId}&subjectName=${encodeURIComponent(salon.name)}&subjectPhoto=${encodeURIComponent(salon.photoUrls[0] ?? '')}` as never)}
                style={[styles.leaveReviewBtn, { borderColor: '#D85A30' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="star" size={18} color="#D85A30" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#D85A30', marginLeft: 6 }}>Leave a Review</Text>
              </TouchableOpacity>
            )}
            {existingReview && (
              <Text style={{ fontSize: 13, color: theme.text.tertiary, textAlign: 'center', marginTop: 8 }}>
                You reviewed this salon — {existingReview.rating}/5 ★
              </Text>
            )}
            {!avgRating && !canReview && (
              <Text style={[styles.emptyMsg, { color: theme.text.tertiary }]}>No reviews yet</Text>
            )}
          </View>
        )}

        {/* ── Tab: PORTFOLIO ── */}
        {activeTab === 'portfolio' && (
          <View style={styles.tabContent}>
            {salon.photoUrls.length > 0 ? (
              <View style={styles.portfolioGrid}>
                {salon.photoUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.portfolioThumb} resizeMode="cover" />
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyMsg, { color: theme.text.tertiary }]}>No photos yet</Text>
            )}
          </View>
        )}

        {/* ── Tab: INFO ── */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            {salon.description && (
              <View style={[styles.infoCard, { backgroundColor: theme.bg.elevated }]}>
                <Text style={[styles.infoCardLabel, { color: theme.text.tertiary }]}>ABOUT</Text>
                <Text style={{ fontSize: 14, color: theme.text.primary, lineHeight: 22 }}>{salon.description}</Text>
              </View>
            )}
            {(salon.city || salon.state) && (
              <TouchableOpacity
                onPress={handleGetDirections}
                style={[styles.infoCard, { backgroundColor: theme.bg.elevated }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.infoCardLabel, { color: theme.text.tertiary }]}>LOCATION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="location-outline" size={16} color="#D85A30" />
                  <Text style={{ fontSize: 14, color: theme.text.primary, flex: 1 }}>
                    {[salon.city, salon.state].filter(Boolean).join(', ')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#D85A30', fontWeight: '600' }}>Directions →</Text>
                </View>
              </TouchableOpacity>
            )}
            {salon.specialties.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: theme.bg.elevated }]}>
                <Text style={[styles.infoCardLabel, { color: theme.text.tertiary }]}>SPECIALTIES</Text>
                <View style={styles.pillRow}>
                  {salon.specialties.map((s) => (
                    <View key={s} style={[styles.pill, { backgroundColor: theme.bg.input }]}>
                      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Jobs tab content — shown in INFO tab to workers/owners */}
        {activeTab === 'info' && (isOwner || currentUser?.role === Role.WORKER) && jobs.length > 0 && (
          <View style={styles.jobsSection}>
            <Text style={[styles.jobsTitle, { color: theme.text.primary }]}>Open Positions</Text>
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
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Book Now CTA ── */}
      {!isOwner && !isSalon && salon?.acceptsBookings && (
        <View
          style={[
            styles.ctaBar,
            { paddingBottom: Math.max(bottom, 16), borderTopColor: theme.border.subtle, backgroundColor: theme.bg.base },
          ]}
        >
          <Button
            variant="primary"
            size="lg"
            onPress={handleBookNow}
            fullWidth
          >
            Book Now
          </Button>
        </View>
      )}
    </SafeAreaView>
  )
}

function SalonProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <Skeleton width="100%" height={260} radius={0} />
      <View style={[styles.identity, { backgroundColor: theme.bg.base }]}>
        <Skeleton width={200} height={24} radius={8} />
        <View style={styles.nameRow}>
          <Skeleton width={80} height={20} radius={10} />
          <Skeleton width={60} height={20} radius={10} />
        </View>
        <Skeleton width="100%" height={70} radius={16} />
        <View style={styles.actionRow}>
          <Skeleton width={60} height={44} radius={12} />
          <Skeleton width={60} height={44} radius={12} />
          <Skeleton width={60} height={44} radius={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 8 }}>
        <Skeleton width={70} height={14} radius={6} />
        <Skeleton width={70} height={14} radius={6} />
        <Skeleton width={70} height={14} radius={6} />
      </View>
      <View style={[styles.tabContent]}>
        <Skeleton width="100%" height={64} radius={12} />
        <Skeleton width="100%" height={64} radius={12} />
        <Skeleton width="100%" height={64} radius={12} />
      </View>
    </ScrollView>
  )
}

const { width: SCREEN_W } = Dimensions.get('window')
const PORTFOLIO_COL = (SCREEN_W - 4) / 3

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    height: 260,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBack: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  heroBackCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Identity / Stats ──────────────────────────────────────────────────────
  identity: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  salonName: { fontSize: 22, fontWeight: '800', flex: 1, letterSpacing: -0.4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  specialtyLine: {
    fontSize: 13,
    marginTop: -2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  // ── 4 Action buttons ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Booksy tabs ───────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#D85A30',
  },
  // ── Tab content ───────────────────────────────────────────────────────────
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  svcCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 2,
  },
  serviceSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  serviceSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  emptyMsg: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 40,
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reviewRatingBig: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  leaveReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginHorizontal: -16,
  },
  portfolioThumb: {
    width: PORTFOLIO_COL,
    height: PORTFOLIO_COL,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  // ── Jobs / Misc ───────────────────────────────────────────────────────────
  jobsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  jobsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  jobCardWrap: { marginBottom: 8 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorText: { textAlign: 'center' },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
