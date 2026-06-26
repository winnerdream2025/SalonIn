import React, { useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Skeleton, useTheme } from '@salonin/ui'
import { useClientList } from '../../services/booking/booking.hooks'
import type { ClientSummary } from '../../services/booking/booking.types'

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ClientCard({ client, theme }: { client: ClientSummary; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: '/clients/[email]' as never,
        params: {
          email: encodeURIComponent(client.clientEmail),
          clientEmail: client.clientEmail,
          clientName: client.clientName,
          clientPhone: client.clientPhone ?? '',
          totalBookings: String(client.totalBookings),
          totalSpent: String(client.totalSpent),
          completedBookings: String(client.completedBookings),
          cancelledBookings: String(client.cancelledBookings),
          noShowBookings: String(client.noShowBookings),
          lastVisit: client.lastVisit ?? '',
        },
      })}
      style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: '#D85A3015' }]}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#D85A30' }}>
          {client.clientName[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text.primary }}>{client.clientName}</Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>{client.clientEmail}</Text>
        <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
          Last visit: {formatDate(client.lastVisit)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D9E75' }}>
          {formatCurrency(client.totalSpent)}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {client.totalBookings} booking{client.totalBookings !== 1 ? 's' : ''}
        </Text>
        {client.noShowBookings > 0 && (
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{client.noShowBookings} no-show</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  )
}

export default function ClientListScreen() {
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const { clients, isLoading, error, refetch } = useClientList()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          c.clientName.toLowerCase().includes(search.toLowerCase()) ||
          c.clientEmail.toLowerCase().includes(search.toLowerCase())
      )
    : clients

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Clients</Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>
          {clients.length} total client{clients.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: theme.border.subtle }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.bg.input, borderColor: theme.border.default }]}>
          <Ionicons name="search-outline" size={16} color={theme.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search clients..."
            placeholderTextColor={theme.text.tertiary}
            style={{ flex: 1, fontSize: 14, color: theme.text.primary, marginLeft: 8 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1,2,3,4,5].map(k => <Skeleton key={k} height={72} radius={14} />)}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12 }}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={[styles.retryBtn, { borderColor: theme.border.default }]} activeOpacity={0.75}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {search ? 'No clients match your search.' : 'No clients yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.clientEmail}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => <ClientCard client={item} theme={theme} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
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
})
