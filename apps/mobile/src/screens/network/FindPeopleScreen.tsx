import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Avatar, Text, useTheme } from '@salonin/ui'
import { followsApi, messagesApi, parseApiError } from '@salonin/api-client'
import type { FollowUser, SuggestedUser } from '@salonin/api-client'
import { useFollowing, useSuggestedUsers } from '../../hooks/useFollow'
import { useAuthStore } from '../../store/authStore'

// ─── Tab types ────────────────────────────────────────────────────────────────

type NetworkTab = 'Suggested' | 'Following' | 'Friends'
const TABS: NetworkTab[] = ['Suggested', 'Following', 'Friends']

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onSelect,
  counts,
}: {
  active: NetworkTab
  onSelect: (t: NetworkTab) => void
  counts: Record<NetworkTab, number>
}) {
  const { theme } = useTheme()
  return (
    <View style={[tabStyles.wrap, { borderBottomColor: theme.border.subtle }]}>
      {TABS.map((tab) => {
        const isActive = tab === active
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onSelect(tab)}
            activeOpacity={0.75}
            style={tabStyles.tab}
          >
            <View style={tabStyles.labelRow}>
              <Text style={[tabStyles.label, { color: isActive ? theme.brand.primary : theme.text.secondary }]}>
                {tab}
              </Text>
              {counts[tab] > 0 && (
                <View style={[tabStyles.badge, { backgroundColor: isActive ? theme.brand.primary : theme.bg.elevated }]}>
                  <Text style={[tabStyles.badgeText, { color: isActive ? '#fff' : theme.text.secondary }]}>
                    {counts[tab] > 99 ? '99+' : counts[tab]}
                  </Text>
                </View>
              )}
            </View>
            {isActive && <View style={[tabStyles.indicator, { backgroundColor: theme.brand.primary }]} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const tabStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 14, fontWeight: '700' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderRadius: 2,
  },
})

// ─── Reason badge label ───────────────────────────────────────────────────────

function ReasonBadge({ reason }: { reason: SuggestedUser['reason'] }) {
  const label = reason === 'mutual' ? 'Follows you' : 'Top rated'
  const color = reason === 'mutual' ? '#1D9E75' : '#D85A30'
  const bg = reason === 'mutual' ? 'rgba(29,158,117,0.10)' : 'rgba(216,90,48,0.10)'
  return (
    <View style={[reasonStyles.pill, { backgroundColor: bg }]}>
      <Ionicons name={reason === 'mutual' ? 'person-add-outline' : 'star-outline'} size={10} color={color} />
      <Text style={[reasonStyles.text, { color }]}>{label}</Text>
    </View>
  )
}
const reasonStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  text: { fontSize: 10, fontWeight: '700' },
})

// ─── Action button helper ─────────────────────────────────────────────────────

function ActionButton({
  label,
  variant,
  onPress,
  loading,
}: {
  label: string
  variant: 'primary' | 'secondary' | 'ghost'
  onPress: () => void
  loading?: boolean
}) {
  const { theme } = useTheme()
  const bg =
    variant === 'primary'
      ? theme.brand.primary
      : variant === 'secondary'
        ? theme.bg.elevated
        : 'transparent'
  const textColor =
    variant === 'primary' ? '#fff' : variant === 'secondary' ? theme.text.secondary : theme.text.tertiary
  const border = variant === 'secondary' ? theme.border.default : undefined

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
      style={[
        actionStyles.btn,
        { backgroundColor: bg },
        border != null && { borderWidth: 1, borderColor: border },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[actionStyles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}
const actionStyles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, minWidth: 80, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
})

// ─── Suggested user row ───────────────────────────────────────────────────────

function SuggestedRow({
  user,
  onFollow,
  onRemove,
  followed,
  loading,
}: {
  user: SuggestedUser
  onFollow: () => void
  onRemove: () => void
  followed: boolean
  loading: boolean
}) {
  const { theme } = useTheme()
  return (
    <View style={[rowStyles.row, { borderBottomColor: theme.border.subtle }]}>
      <TouchableOpacity
        style={rowStyles.info}
        onPress={() => router.push(`/worker/${user.id}` as never)}
        activeOpacity={0.8}
      >
        <Avatar uri={user.photoUrl} name={user.name} size="md" />
        <View style={rowStyles.meta}>
          <View style={rowStyles.nameRow}>
            <Text style={[rowStyles.name, { color: theme.text.primary }]} numberOfLines={1}>
              {user.name}
            </Text>
            {user.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={theme.brand.primary} />
            )}
          </View>
          {user.specialties.length > 0 && (
            <Text style={[rowStyles.sub, { color: theme.text.secondary }]} numberOfLines={1}>
              {user.specialties[0]}
            </Text>
          )}
          {(user.city ?? user.state) && (
            <Text style={[rowStyles.sub, { color: theme.text.tertiary }]} numberOfLines={1}>
              {[user.city, user.state].filter(Boolean).join(', ')}
            </Text>
          )}
          <ReasonBadge reason={user.reason} />
        </View>
      </TouchableOpacity>
      <View style={rowStyles.actions}>
        {!followed ? (
          <>
            <ActionButton label="Follow" variant="primary" onPress={onFollow} loading={loading} />
            <TouchableOpacity onPress={onRemove} style={rowStyles.removeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          </>
        ) : (
          <ActionButton label="Following" variant="secondary" onPress={onFollow} loading={loading} />
        )}
      </View>
    </View>
  )
}

// ─── Following / Friends row ──────────────────────────────────────────────────

function NetworkRow({
  user,
  isFriend,
  onMessage,
  onUnfollow,
  onRemove,
  loadingUnfollow,
}: {
  user: FollowUser
  isFriend: boolean
  onMessage: () => void
  onUnfollow: () => void
  onRemove?: () => void
  loadingUnfollow: boolean
}) {
  const { theme } = useTheme()
  const displayName = user.workerProfile?.name ?? user.salonProfile?.name ?? 'Unknown'
  const photoUrl = user.workerProfile?.photoUrl ?? user.salonProfile?.photoUrls[0] ?? null
  const specialties = user.workerProfile?.specialties ?? user.salonProfile?.specialties ?? []
  const location = [
    user.workerProfile?.city ?? user.salonProfile?.city,
    user.workerProfile?.state ?? user.salonProfile?.state,
  ].filter(Boolean).join(', ')
  const isVerified = user.workerProfile?.isVerified ?? user.salonProfile?.isVerified ?? false

  return (
    <View style={[rowStyles.row, { borderBottomColor: theme.border.subtle }]}>
      <TouchableOpacity
        style={rowStyles.info}
        onPress={() => router.push(`/worker/${user.id}` as never)}
        activeOpacity={0.8}
      >
        <Avatar uri={photoUrl} name={displayName} size="md" />
        <View style={rowStyles.meta}>
          <View style={rowStyles.nameRow}>
            <Text style={[rowStyles.name, { color: theme.text.primary }]} numberOfLines={1}>
              {displayName}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={theme.brand.primary} />
            )}
            {isFriend && (
              <View style={[rowStyles.friendBadge, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
                <Text style={[rowStyles.friendBadgeText, { color: '#1D9E75' }]}>Connected</Text>
              </View>
            )}
          </View>
          {specialties.length > 0 && (
            <Text style={[rowStyles.sub, { color: theme.text.secondary }]} numberOfLines={1}>
              {specialties[0]}
            </Text>
          )}
          {location && (
            <Text style={[rowStyles.sub, { color: theme.text.tertiary }]} numberOfLines={1}>
              {location}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={rowStyles.actions}>
        <ActionButton label="Message" variant="primary" onPress={onMessage} />
        {isFriend && onRemove ? (
          <TouchableOpacity onPress={onRemove} style={rowStyles.removeBtn} activeOpacity={0.7}>
            <Ionicons name="person-remove-outline" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        ) : (
          <ActionButton label="Unfollow" variant="secondary" onPress={onUnfollow} loading={loadingUnfollow} />
        )}
      </View>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  info: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, minWidth: 0 },
  meta: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  sub: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  removeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  friendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  friendBadgeText: { fontSize: 10, fontWeight: '700' },
})

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: NetworkTab }) {
  const { theme } = useTheme()
  const config = {
    Suggested: {
      icon: 'people-outline' as const,
      title: 'No suggestions right now',
      sub: "Check back soon — we'll surface top professionals for you",
    },
    Following: {
      icon: 'person-add-outline' as const,
      title: "You're not following anyone yet",
      sub: 'Discover talented beauty professionals to follow',
    },
    Friends: {
      icon: 'heart-outline' as const,
      title: 'No connections yet',
      sub: "When someone follows you back, they'll appear here",
    },
  }[tab]

  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconBox, { backgroundColor: 'rgba(216,90,48,0.08)' }]}>
        <Ionicons name={config.icon} size={30} color={theme.brand.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: theme.text.primary }]}>{config.title}</Text>
      <Text style={[emptyStyles.sub, { color: theme.text.secondary }]}>{config.sub}</Text>
      {tab !== 'Friends' && (
        <TouchableOpacity
          onPress={() => router.push('/search' as never)}
          style={[emptyStyles.btn, { backgroundColor: theme.brand.primary }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Find professionals</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  iconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 22 },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FindPeopleScreen() {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const currentUser = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<NetworkTab>('Suggested')
  const [search, setSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Suggested
  const { suggestions, isLoading: suggestLoading } = useSuggestedUsers()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set())

  // Following
  const {
    data: following,
    isLoading: followingLoading,
    loadMore: loadMoreFollowing,
    onSearch: onFollowingSearch,
    toggleFollow: toggleFollowingFollow,
  } = useFollowing(currentUser?.id)
  const [unfollowLoadingIds] = useState<Set<string>>(new Set())

  // Friends = following where isFollowedBack is true
  const friends = useMemo(() => following.filter((u) => u.isFollowedBack), [following])

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    const visible = suggestions.filter((u) => !hiddenIds.has(u.id))
    if (!q) return visible
    return visible.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.specialties.some((s) => s.toLowerCase().includes(q)),
    )
  }, [suggestions, hiddenIds, search])

  const filteredFollowing = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return following
    return following.filter(
      (u) =>
        (u.workerProfile?.name ?? u.salonProfile?.name ?? '').toLowerCase().includes(q),
    )
  }, [following, search])

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (u) =>
        (u.workerProfile?.name ?? u.salonProfile?.name ?? '').toLowerCase().includes(q),
    )
  }, [friends, search])

  const counts: Record<NetworkTab, number> = {
    Suggested: filteredSuggestions.length,
    Following: filteredFollowing.length,
    Friends: filteredFriends.length,
  }

  const handleFollow = useCallback(async (userId: string) => {
    if (followLoadingIds.has(userId)) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const alreadyFollowed = followedIds.has(userId)
    setFollowLoadingIds((s) => new Set([...s, userId]))
    try {
      if (alreadyFollowed) {
        await followsApi.unfollow(userId)
        setFollowedIds((s) => { const n = new Set(s); n.delete(userId); return n })
      } else {
        await followsApi.follow(userId)
        setFollowedIds((s) => new Set([...s, userId]))
      }
    } catch {
      // revert — no-op since we optimistically updated above; user can retry
    } finally {
      setFollowLoadingIds((s) => { const n = new Set(s); n.delete(userId); return n })
    }
  }, [followedIds, followLoadingIds])

  const handleRemoveSuggestion = useCallback((userId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setHiddenIds((s) => new Set([...s, userId]))
  }, [])

  const handleMessage = useCallback(async (userId: string, name: string, photoUrl: string | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!currentUser) { router.push('/(auth)/login'); return }
    try {
      const conv = await messagesApi.createConversation(userId)
      router.push({
        pathname: '/chat/[id]',
        params: { id: conv.id, name, otherUserId: userId, otherPhotoUrl: photoUrl ?? '' },
      } as never)
    } catch (e) {
      Alert.alert('Couldn\'t start chat', parseApiError(e))
    }
  }, [currentUser])

  const handleUnfollowConfirm = useCallback((userId: string, name: string) => {
    Alert.alert('Unfollow', `Unfollow ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: () => void toggleFollowingFollow(userId, true),
      },
    ])
  }, [toggleFollowingFollow])

  const handleRemoveFriend = useCallback((userId: string, name: string) => {
    Alert.alert(
      'Remove connection',
      `You'll stop following ${name} but they can still follow you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void toggleFollowingFollow(userId, true),
        },
      ],
    )
  }, [toggleFollowingFollow])

  // ── Tab content ────────────────────────────────────────────────────────────

  const renderSuggested = useCallback(
    ({ item }: { item: SuggestedUser }) => (
      <SuggestedRow
        user={item}
        followed={followedIds.has(item.id)}
        loading={followLoadingIds.has(item.id)}
        onFollow={() => void handleFollow(item.id)}
        onRemove={() => handleRemoveSuggestion(item.id)}
      />
    ),
    [followedIds, followLoadingIds, handleFollow, handleRemoveSuggestion],
  )

  const renderFollowing = useCallback(
    ({ item }: { item: FollowUser }) => {
      const name = item.workerProfile?.name ?? item.salonProfile?.name ?? 'Unknown'
      const photo = item.workerProfile?.photoUrl ?? item.salonProfile?.photoUrls[0] ?? null
      return (
        <NetworkRow
          user={item}
          isFriend={false}
          onMessage={() => void handleMessage(item.id, name, photo)}
          onUnfollow={() => handleUnfollowConfirm(item.id, name)}
          loadingUnfollow={unfollowLoadingIds.has(item.id)}
        />
      )
    },
    [handleMessage, handleUnfollowConfirm, unfollowLoadingIds],
  )

  const renderFriend = useCallback(
    ({ item }: { item: FollowUser }) => {
      const name = item.workerProfile?.name ?? item.salonProfile?.name ?? 'Unknown'
      const photo = item.workerProfile?.photoUrl ?? item.salonProfile?.photoUrls[0] ?? null
      return (
        <NetworkRow
          user={item}
          isFriend={true}
          onMessage={() => void handleMessage(item.id, name, photo)}
          onUnfollow={() => void toggleFollowingFollow(item.id, true)}
          onRemove={() => handleRemoveFriend(item.id, name)}
          loadingUnfollow={unfollowLoadingIds.has(item.id)}
        />
      )
    },
    [handleMessage, handleRemoveFriend, toggleFollowingFollow, unfollowLoadingIds],
  )

  const activeData =
    activeTab === 'Suggested'
      ? filteredSuggestions
      : activeTab === 'Following'
        ? filteredFollowing
        : filteredFriends

  const activeRender =
    activeTab === 'Suggested'
      ? renderSuggested
      : activeTab === 'Following'
        ? renderFollowing
        : renderFriend

  const isActiveLoading =
    activeTab === 'Suggested' ? suggestLoading : followingLoading

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]}>My Network</Text>
        <TouchableOpacity
          onPress={() => { setIsSearching((s) => !s); setSearch('') }}
          style={[styles.iconBtn, { backgroundColor: theme.bg.elevated }]}
          activeOpacity={0.8}
        >
          <Ionicons name={isSearching ? 'close' : 'search'} size={18} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      {isSearching && (
        <View style={[styles.searchWrap, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
          <Ionicons name="search" size={15} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder={`Search ${activeTab.toLowerCase()}…`}
            placeholderTextColor={theme.text.tertiary}
            value={search}
            onChangeText={(t) => {
              setSearch(t)
              if (activeTab !== 'Suggested') onFollowingSearch(t)
            }}
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); onFollowingSearch('') }} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Tabs ── */}
      <TabBar active={activeTab} onSelect={setActiveTab} counts={counts} />

      {/* ── Section header ── */}
      <View style={[styles.sectionHeader, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
          {activeTab === 'Suggested' && 'People you may know in the beauty industry'}
          {activeTab === 'Following' && "Professionals you're following"}
          {activeTab === 'Friends' && 'Mutual connections'}
        </Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={isActiveLoading ? [] : (activeData as never[])}
        keyExtractor={(item: never) => (item as { id: string }).id}
        renderItem={activeRender as never}
        onEndReached={activeTab !== 'Suggested' ? loadMoreFollowing : undefined}
        onEndReachedThreshold={0.3}
        contentContainerStyle={[styles.list, { paddingBottom: 40 + bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isActiveLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.brand.primary} />
            </View>
          ) : (
            <EmptyState tab={activeTab} />
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  title: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 12, fontWeight: '500' },
  list: { flexGrow: 1 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
})
