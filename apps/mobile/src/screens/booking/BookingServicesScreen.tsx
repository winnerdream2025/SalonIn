import React, { useCallback, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { messagesApi, workersApi, salonsApi } from '@salonin/api-client'
import { useProviderServices } from '../../services/booking/booking.hooks'
import { useAuthStore } from '../../store/authStore'
import type { ProviderService } from '../../services/booking/booking.types'

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
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
      style={[styles.serviceCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
    >
      <View style={styles.serviceInfo}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, marginBottom: 4 }}
        >
          {service.name}
        </Text>
        {service.description ? (
          <Text
            numberOfLines={2}
            style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 18 }}
          >
            {service.description}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, color: theme.text.tertiary, marginTop: 6 }}>
          {formatDuration(service.duration)}
        </Text>
      </View>

      <View style={styles.serviceMeta}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#D85A30' }}>
          {formatPrice(service.price, service.currency)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  )
}

function ServiceSkeleton({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={[styles.serviceCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.serviceInfo}>
        <View style={[styles.skeletonLine, { width: 160, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 220, marginTop: 8, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 80, marginTop: 8, backgroundColor: theme.border.default }]} />
      </View>
      <View style={[styles.skeletonLine, { width: 64, height: 20, backgroundColor: theme.border.default }]} />
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
  const [isMessaging, setIsMessaging] = useState(false)

  const { services, isLoading, error, refetch } = useProviderServices(
    providerId ?? null,
    providerType ?? 'professional',
  )

  const handleMessage = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to message this provider.', [
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
        { text: 'Cancel', style: 'cancel' },
      ])
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
  }, [currentUser, providerId, providerType, providerName])

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
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
            Book a Service
          </Text>
          {providerName ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>
              {providerName}
            </Text>
          ) : null}
        </View>
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
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={theme.text.tertiary}
            />
          }
        >
          <Text style={{ fontSize: 13, color: theme.text.tertiary, marginBottom: 12, letterSpacing: 0.2 }}>
            SELECT A SERVICE
          </Text>
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onPress={() => handleSelectService(s)}
              theme={theme}
            />
          ))}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceMeta: { alignItems: 'flex-end' },
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
})
