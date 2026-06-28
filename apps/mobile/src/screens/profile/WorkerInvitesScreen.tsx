import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text, Button, useTheme } from '@salonin/ui'
import { salonsApi } from '@salonin/api-client'
import type { SalonStaffRecord } from '@salonin/api-client'

export default function WorkerInvitesScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [invites, setInvites] = useState<SalonStaffRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setInvites(await salonsApi.getMyInvites())
    } catch {
      Alert.alert('Error', 'Could not load invites.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleRespond = useCallback(async (invite: SalonStaffRecord, accept: boolean) => {
    setActing(invite.id)
    try {
      if (accept) {
        await salonsApi.acceptInvite(invite.id)
      } else {
        await salonsApi.declineInvite(invite.id)
      }
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
      Alert.alert(accept ? 'Joined! 🎉' : 'Invite declined', accept
        ? `You've joined ${invite.salon?.name ?? 'the salon'}'s team.`
        : 'You can always reconnect later.',
      )
    } catch {
      Alert.alert('Error', 'Could not respond to invite.')
    } finally {
      setActing(null)
    }
  }, [])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]}>Salon Invites</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={[styles.content, { alignItems: 'center', paddingTop: 40 }]}>
          <Ionicons name="mail-outline" size={40} color={theme.text.tertiary} />
          <Text variant="caption" color="secondary" style={{ marginTop: 12 }}>Loading invites…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}>
          {invites.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
              <Ionicons name="mail-open-outline" size={40} color={theme.text.tertiary} />
              <Text variant="body" color="secondary" style={{ marginTop: 12, textAlign: 'center' }}>
                No pending invites.
              </Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 6, textAlign: 'center' }}>
                When a salon invites you to join their team, it'll appear here.
              </Text>
            </View>
          ) : (
            invites.map((invite) => {
              const s = invite.salon
              const isActing = acting === invite.id
              return (
                <View
                  key={invite.id}
                  style={[styles.card, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}
                >
                  <View style={styles.cardRow}>
                    {s?.photoUrls?.length ? (
                      <Image source={{ uri: s.photoUrls[0] }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.bg.input }]}>
                        <Text style={{ fontSize: 18, color: theme.text.secondary }}>
                          {s?.name[0]?.toUpperCase() ?? 'S'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
                        {s?.name ?? 'Salon'}
                      </Text>
                      {s?.city ? (
                        <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
                          {s.city}{s.state ? `, ${s.state}` : ''}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 4 }}>
                        Invited {new Date(invite.invitedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <View style={styles.actionBtn}>
                      <Button
                        variant="ghost"
                        onPress={() => void handleRespond(invite, false)}
                        loading={isActing}
                      >
                        Decline
                      </Button>
                    </View>
                    <View style={styles.actionBtn}>
                      <Button
                        variant="primary"
                        onPress={() => void handleRespond(invite, true)}
                        loading={isActing}
                      >
                        Accept
                      </Button>
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
})
