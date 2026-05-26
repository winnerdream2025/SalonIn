import React, { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme, MessageBubble, MessageBubbleSkeleton, ReportModal } from '@salonin/ui'
import type { Message } from '@salonin/types'
import { reportsApi } from '@salonin/api-client'
import { useMessages } from '../../hooks/useMessages'
import { useAuthStore } from '../../store/authStore'

const SKELETON_COUNT = 8

export default function ChatScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { id, name, otherUserId } = useLocalSearchParams<{ id: string; name: string; otherUserId?: string }>()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const {
    messages,
    isLoading,
    isLoadingMore,
    sendMessage,
    loadMore,
    typingUsers,
    setTyping,
  } = useMessages(id)

  const [draft, setDraft] = useState('')
  const [showReport, setShowReport] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setTyping(false)
    await sendMessage(text)
  }, [draft, sendMessage, setTyping])

  const handleChangeText = useCallback(
    (text: string) => {
      setDraft(text)
      setTyping(text.length > 0)
    },
    [setTyping],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isSelf = item.senderId === currentUserId
      const showAvatar = !isSelf && (index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId)
      return (
        <MessageBubble
          message={item}
          isSelf={isSelf}
          showAvatar={showAvatar}
        />
      )
    },
    [currentUserId, messages],
  )

  const othersTyping = typingUsers.filter((uid) => uid !== currentUserId)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: theme.brand.primary }]}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {name ?? 'Chat'}
        </Text>
        {otherUserId != null ? (
          <TouchableOpacity onPress={() => setShowReport(true)} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.reportIcon, { color: theme.text.secondary }]}>{'⋯'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <FlatList
            data={Array.from({ length: SKELETON_COUNT })}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ index }) => <MessageBubbleSkeleton isSelf={index % 3 === 0} />}
            inverted
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator size="small" color={theme.brand.primary} style={styles.moreLoader} />
              ) : null
            }
          />
        )}

        {othersTyping.length > 0 && (
          <View style={styles.typingRow}>
            <Text style={[styles.typingText, { color: theme.text.secondary }]}>typing…</Text>
          </View>
        )}

        <View style={[styles.inputRow, { borderTopColor: theme.border.default, backgroundColor: theme.bg.surface, paddingBottom: Math.max(bottom, 12) }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: theme.bg.elevated, color: theme.text.primary }]}
            value={draft}
            onChangeText={handleChangeText}
            placeholder="Type a message…"
            placeholderTextColor={theme.text.secondary}
            multiline
            maxLength={2000}
            keyboardAppearance="dark"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? theme.brand.primary : theme.bg.elevated }]}
            onPress={() => void handleSend()}
            activeOpacity={0.8}
            disabled={!draft.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
        {otherUserId != null && (
        <ReportModal
          isVisible={showReport}
          reportedName={name ?? 'User'}
          onClose={() => setShowReport(false)}
          onSubmit={async (type, reason) => {
            await reportsApi.createReport(otherUserId, type, reason)
            setShowReport(false)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, lineHeight: 40 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },

  listContent: { paddingVertical: 12, paddingBottom: 4 },
  moreLoader: { padding: 12 },

  typingRow: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 12, fontStyle: 'italic' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  reportIcon: { fontSize: 20, fontWeight: '700' },
})
