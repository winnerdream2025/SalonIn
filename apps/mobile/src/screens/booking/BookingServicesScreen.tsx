import React, { useCallback, useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { messagesApi, workersApi, salonsApi } from '@salonin/api-client'
import { useProviderServices } from '../../services/booking/booking.hooks'
import { formatPrice, formatDuration } from '../../utils/formatters'
import { useAuthStore } from '../../store/authStore'
import { useAuthGateStore } from '../../store/authGateStore'
import type { ProviderService } from '../../services/booking/booking.types'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}


function ServiceCard({
  service,
  onPress,
  theme,
}: {
  service: ProviderService
  onPress: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.serviceRow}
    >
      <View style={styles.serviceInfo}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
          {service.name}
        </Text>
        {service.description ? (
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
            {service.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.serviceMeta}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary, textAlign: 'right' }}>
          {formatPrice(service.price, service.currency)}{service.price === 0 ? '' : '+'}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.tertiary, textAlign: 'right', marginTop: 1 }}>
          {formatDuration(service.duration)}
        </Text>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.bookPill}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

function ServiceSkeleton({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={[styles.serviceRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }]}>
      <View style={styles.serviceInfo}>
        <View style={[styles.skeletonLine, { width: 160, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 110, marginTop: 8, backgroundColor: theme.border.default }]} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[styles.skeletonLine, { width: 56, height: 16, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 64, height: 32, borderRadius: 16, backgroundColor: theme.border.default }]} />
      </View>
    </View>
  )
}

function CategorySection({
  category,
  services,
  expanded,
  onToggle,
  onBook,
  theme,
}: {
  category: string
  services: ProviderService[]
  expanded: boolean
  onToggle: () => void
  onBook: (svc: ProviderService) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.75}
        style={[styles.categoryHeader, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
      >
        <Text style={[styles.categoryHeaderTitle, { color: theme.text.primary }]}>
          {category}
        </Text>
        <View style={styles.categoryHeaderRight}>
          <Text style={[styles.categoryCount, { color: theme.text.tertiary }]}>{services.length}</Text>
          <Text style={[styles.categoryChevron, { color: theme.text.tertiary }]}>
            {expanded ? '∧' : '∨'}
          </Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.listContainer, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          {services.map((s, idx) => (
            <React.Fragment key={s.id}>
              <ServiceCard service={s} onPress={() => onBook(s)} theme={theme} />
              {idx < services.length - 1 && (
                <View style={[styles.separator, { backgroundColor: theme.border.subtle }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  )
}

export default function BookingServicesScreen() {
  const { providerId, providerType, providerName } =
    useLocalSearchParams<{
      providerId: string
      providerType: string
      providerName: string
    }>()

  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const currentUser = useAuthStore((s) => s.user)
  const showGate = useAuthGateStore((s) => s.show)
  const [isMessaging, setIsMessaging] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const { services, isLoading, error, refetch } = useProviderServices(
    providerId ?? null,
    providerType ?? 'professional',
  )

  // Group services by category; null category goes into 'Other'
  const grouped = useMemo(() => {
    if (services.length === 0) return []
    const map = new Map<string, ProviderService[]>()
    for (const s of services) {
      const key = s.category ? capitalize(s.category) : 'Other'
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [services])

  const toggleCategory = useCallback((cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const handleMessage = useCallback(async () => {
    if (!currentUser) {
      showGate('/(tabs)/messages', 'Sign in to message this provider')
      return
    }
    setIsMessaging(true)
    try {
      let providerUserId: string | null = null
      let providerDisplayName = providerName ?? 'Provider'
      if (providerType === 'salon') {
        const salon = await salonsApi.getById(providerId ?? '').catch(() => null)
        providerUserId = (salon as any)?.userId ?? null
        providerDisplayName = (salon as any)?.name ?? providerDisplayName
      } else {
        const worker = await workersApi.getById(providerId ?? '').catch(() => null)
        providerUserId = (worker as any)?.userId ?? null
        providerDisplayName = (worker as any)?.name ?? providerDisplayName
      }
      if (!providerUserId) {
        Alert.alert('Error', 'Could not find this provider. Please try again.')
        return
      }
      const conv = await messagesApi.createConversation(providerUserId)
      router.push({
        pathname: '/chat/[id]',
        params: { id: conv.id, name: providerDisplayName, otherUserId: providerUserId, otherPhotoUrl: '' },
      } as never)
    } catch {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    } finally {
      setIsMessaging(false)
    }
  }, [currentUser, showGate, providerId, providerType, providerName])

  const handleSelectService = useCallback(
    (service: ProviderService) => {
      router.push({
        pathname: '/booking/slots',
        params: {
          providerId,
          providerType: providerType ?? 'professional',
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: String(service.price),
          serviceCurrency: service.currency,
          serviceDuration: String(service.duration),
          providerName: providerName ?? '',
        },
      } as never)
    },
    [providerId, providerType, providerName],
  )

  const notBookable = !isLoading && !error && services.length === 0

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header — StyleSeat "Your appointment with" style */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 12 }}>
          <Text style={{ fontSize: 11, color: theme.text.tertiary, letterSpacing: 0.3 }}>
            Your appointment with
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, marginTop: 2 }}>
            {providerName ?? 'Provider'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {[1, 2, 3].map((k) => <ServiceSkeleton key={k} theme={theme} />)}
        </ScrollView>
      ) : error ? (
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            style={[styles.retryBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notBookable ? (
        <View style={styles.centeredState}>
          <Ionicons name="calendar-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            This provider has no services listed yet.
          </Text>
          <TouchableOpacity
            onPress={() => void handleMessage()}
            disabled={isMessaging}
            style={[styles.messageBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={16} color={theme.text.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 14 }}>
              {isMessaging ? 'Opening chat…' : 'Message Provider'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : services.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="list-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            No services listed yet.
          </Text>
          <TouchableOpacity
            onPress={() => void handleMessage()}
            disabled={isMessaging}
            style={[styles.messageBtn, { borderColor: theme.border.default }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={16} color={theme.text.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 14 }}>
              {isMessaging ? 'Opening chat…' : 'Message Provider'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.text.tertiary} />}
        >
          <Text style={{ fontSize: 11, color: theme.text.tertiary, letterSpacing: 0.8, paddingHorizontal: 4, paddingBottom: 12 }}>
            {services.length} {services.length === 1 ? 'SERVICE' : 'SERVICES'}
          </Text>
          {grouped.length > 1 ? (
            // Multiple categories → collapsible sections
            grouped.map(([cat, svcs]) => (
              <CategorySection
                key={cat}
                category={cat}
                services={svcs}
                expanded={!collapsedCategories.has(cat)}
                onToggle={() => toggleCategory(cat)}
                onBook={handleSelectService}
                theme={theme}
              />
            ))
          ) : (
            // Single / no category → flat list
            <View style={[styles.listContainer, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
              {services.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <ServiceCard service={s} onPress={() => handleSelectService(s)} theme={theme} />
                  {idx < services.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: theme.border.subtle }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceMeta: { alignItems: 'flex-end', gap: 4 },
  bookPill: {
    backgroundColor: '#2196A8',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  retryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 1,
  },
  categoryHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChevron: {
    fontSize: 14,
    fontWeight: '600',
  },
})
