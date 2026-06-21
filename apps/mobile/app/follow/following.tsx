import React, { useCallback } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Avatar, useTheme } from '@salonin/ui'
import { useFollowing } from '../../src/hooks/useFollow'
import { useAuthStore } from '../../src/store/authStore'
import type { FollowUser } from '@salonin/api-client'

export default function FollowingScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>()
  const { theme } = useTheme()
  const { top } = useSafeAreaInsets()
  const currentUser = useAuthStore((s) => s.user)
  const { data, isLoading, loadMore, hasMore, onSearch, toggleFollow } = useFollowing(userId)
  const isOwnProfile = currentUser?.id === userId

  const renderItem = useCallback(({ item }: { item: FollowUser }) => {
    const displayName = item.workerProfile?.name ?? item.salonProfile?.name ?? 'Unknown'
    const photoUrl = item.workerProfile?.photoUrl ?? item.salonProfile?.photoUrls[0] ?? null
    const specialties = item.workerProfile?.specialties ?? item.salonProfile?.specialties ?? []
    const location = [
      item.workerProfile?.city ?? item.salonProfile?.city,
      item.workerProfile?.state ?? item.salonProfile?.state,
    ].filter(Boolean).join(', ')

    const canToggle = currentUser && !item.isOwnProfile

    return (
      <View style={[styles.userRow, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/worker/${item.id}` as never)}
          activeOpacity={0.8}
        >
          <Avatar uri={photoUrl} name={displayName} size="md" />
          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: theme.text.primary }]} numberOfLines={1}>{displayName}</Text>
            {specialties.length > 0 && (
              <Text style={[styles.userSub, { color: theme.text.secondary }]} numberOfLines={1}>
                {specialties[0]}
              </Text>
            )}
            {location && (
              <Text style={[styles.userSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                {location}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {canToggle && (
          <TouchableOpacity
            onPress={() => void toggleFollow(item.id, Boolean(isOwnProfile ? item.isFollowing : item.isFollowing))}
            style={[
              styles.actionBtn,
              item.isFollowing
                ? { borderColor: theme.border.default, backgroundColor: theme.bg.elevated }
                : { borderColor: '#D85A30' },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: item.isFollowing ? theme.text.secondary : '#D85A30' }]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }, [theme, currentUser, isOwnProfile, toggleFollow])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          {name ? `${name} is Following` : 'Following'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.bg.elevated, borderColor: theme.border.subtle }]}>
        <Ionicons name="search" size={16} color={theme.text.tertiary} />
        <TextInput
          placeholder="Search following..."
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary }]}
          onChangeText={onSearch}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#D85A30" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="person-add-outline" size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>Not following anyone yet</Text>
            </View>
          )
        }
        ListFooterComponent={hasMore ? <ActivityIndicator color="#D85A30" style={{ padding: 16 }} /> : null}
      />
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
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { paddingBottom: 32 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  userMeta: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '600' },
  userSub: { fontSize: 13 },
  actionBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
})
