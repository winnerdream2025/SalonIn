import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useStripeConnect } from '../../services/booking/booking.hooks'

export default function StripeConnectScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const { status, isLoading, startOnboarding, getDashboardUrl } = useStripeConnect()

  const isConnected = status?.connected ?? false
  const accountId   = status?.accountId ?? null

  const handleConnect = async () => {
    const url = await startOnboarding()
    if (url) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Coming Soon', 'Stripe Connect setup will be available shortly.')
    }
  }

  const handleOpenDashboard = async () => {
    const url = await getDashboardUrl()
    if (url) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Error', 'Could not open Stripe dashboard. Please try again.')
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Accept Payments</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.content, { paddingBottom: bottom + 20 }]}>
        <View style={[styles.iconRing, { backgroundColor: isConnected ? 'rgba(29,158,117,0.1)' : 'rgba(99,91,255,0.1)' }]}>
          <Ionicons name={isConnected ? 'checkmark-circle' : 'card'} size={40} color={isConnected ? '#1D9E75' : '#635BFF'} />
        </View>

        {isConnected && (
          <View style={[styles.connectedBadge, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#1D9E75" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D9E75', marginLeft: 5 }}>
              Stripe Connected{accountId ? ` · ${accountId.slice(0, 12)}…` : ''}
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text.primary, marginTop: 16, textAlign: 'center' }}>
          {isConnected ? 'Payments Enabled' : 'Connect Stripe to Get Paid'}
        </Text>
        <Text style={{ fontSize: 15, color: theme.text.secondary, textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 16 }}>
          {isConnected
            ? 'Clients can pay deposits when booking. Payouts go directly to your linked Stripe account.'
            : 'Clients will be able to pay a deposit when booking. Funds go directly to your Stripe account after each appointment.'}
        </Text>

        <View style={[styles.benefitsList, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Secure payments via Stripe' },
            { icon: 'flash-outline',            text: 'Instant payouts to your bank' },
            { icon: 'ban-outline',              text: 'Reduce no-shows with deposits' },
            { icon: 'stats-chart-outline',      text: 'Track revenue in Stripe dashboard' },
          ].map(({ icon, text }) => (
            <View key={icon} style={styles.benefit}>
              <Ionicons name={icon as any} size={20} color="#635BFF" />
              <Text style={{ fontSize: 14, color: theme.text.primary, marginLeft: 12, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        {isConnected ? (
          <TouchableOpacity
            onPress={handleOpenDashboard}
            disabled={isLoading}
            style={[styles.connectBtn, { opacity: isLoading ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="open-outline" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Open Stripe Dashboard</Text>
                </View>
              )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleConnect}
            disabled={isLoading}
            style={[styles.connectBtn, { opacity: isLoading ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="card-outline" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Connect with Stripe</Text>
                </View>
              )}
          </TouchableOpacity>
        )}

        <Text style={{ fontSize: 12, color: theme.text.tertiary, textAlign: 'center', marginTop: 16, paddingHorizontal: 24 }}>
          {isConnected
            ? 'View your payouts, balance, and account settings.'
            : "You'll be redirected to Stripe's secure onboarding. This takes about 5 minutes."}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  iconRing: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12,
  },
  benefitsList: {
    width: '100%', borderRadius: 14, borderWidth: 1,
    padding: 16, marginTop: 28, gap: 14,
  },
  benefit: { flexDirection: 'row', alignItems: 'center' },
  connectBtn: {
    marginTop: 24, backgroundColor: '#635BFF', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center',
  },
})
