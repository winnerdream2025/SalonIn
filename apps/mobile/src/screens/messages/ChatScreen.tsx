import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { useTheme, MessageBubble, MessageBubbleSkeleton, ReportModal, Avatar } from '@salonin/ui'
import type { Message } from '@salonin/types'
import { reportsApi, chatRequestsApi } from '@salonin/api-client'
import { useMessages } from '../../hooks/useMessages'
import { useAuthStore } from '../../store/authStore'

const SKELETON_COUNT = 8
const TYPING_TIMEOUT_MS = 3000

export default function ChatScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { id, name, otherUserId, otherPhotoUrl } = useLocalSearchParams<{
    id: string
    name: string
    otherUserId?: string
    otherPhotoUrl?: string
  }>()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const {
    messages,
    isLoading,
    isLoadingMore,
    sendMessage,
    loadMore,
    typingUsers,
    setTyping,
    chatRequest,
    setChatRequest,
  } = useMessages(id)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [isRespondingRequest, setIsRespondingRequest] = useState(false)
  const [typingVisible, setTypingVisible] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)

  const isCurrentUserSender = chatRequest?.senderId === currentUserId
  const isCurrentUserReceiver = chatRequest?.receiverId === currentUserId
  const isPending = chatRequest?.status === 'PENDING'
  const usedMessages = chatRequest?.messageCount ?? 0
  const remaining = 3 - usedMessages
  const isBlocked = isPending && isCurrentUserSender && remaining <= 0
  const isReceiverPending = isPending && isCurrentUserReceiver
  const inputDisabled = isBlocked || isReceiverPending

  const othersTyping = typingUsers.filter((uid) => uid !== currentUserId)

  useEffect(() => {
    if (othersTyping.length > 0) {
      setTypingVisible(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setTypingVisible(false), TYPING_TIMEOUT_MS)
    } else {
      setTypingVisible(false)
    }
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [othersTyping.length])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || inputDisabled || isSending) return
    setIsSending(true)
    setDraft('')
    setTyping(false)
    try {
      await sendMessage(text)
    } catch (e: unknown) {
      setDraft(text)
      const status =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined
      if (status === 403) {
        Alert.alert(
          'Request pending',
          `You've reached the 3-message limit. ${name ?? 'They'} needs to accept your request before you can send more.`,
        )
      } else {
        Alert.alert('Failed to send', 'Check your connection and try again.')
      }
    } finally {
      setIsSending(false)
    }
  }, [draft, sendMessage, setTyping, inputDisabled, isSending, name])

  const handleChangeText = useCallback(
    (text: string) => {
      setDraft(text)
      setTyping(text.length > 0)
    },
    [setTyping],
  )

  const handleAccept = useCallback(async () => {
    if (!chatRequest) return
    setIsRespondingRequest(true)
    try {
      const updated = await chatRequestsApi.respond(chatRequest.id, 'ACCEPT')
      setChatRequest(updated)
    } finally {
      setIsRespondingRequest(false)
    }
  }, [chatRequest])

  const handleDecline = useCallback(async () => {
    if (!chatRequest) return
    setIsRespondingRequest(true)
    try {
      const updated = await chatRequestsApi.respond(chatRequest.id, 'DECLINE')
      setChatRequest(updated)
    } finally {
      setIsRespondingRequest(false)
    }
  }, [chatRequest])

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      if ((item as Message & { isSystem?: boolean }).isSystem) {
        return (
          <View style={styles.systemMsgRow}>
            <View style={[styles.systemBubble, { backgroundColor: theme.bg.elevated }]}>
              <Text style={[styles.systemText, { color: theme.text.secondary }]}>{item.content}</Text>
            </View>
          </View>
        )
      }
      const isSelf = item.senderId === currentUserId
      const showAvatar = !isSelf && (index === 0 || messages[index - 1]?.senderId !== item.senderId)
      return (
        <MessageBubble
          message={item}
          isSelf={isSelf}
          showAvatar={showAvatar}
          senderPhotoUrl={isSelf ? null : (otherPhotoUrl ?? null)}
          senderName={isSelf ? undefined : (name ?? undefined)}
        />
      )
    },
    [currentUserId, messages, otherPhotoUrl, name, theme],
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: theme.brand.primary }]}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar uri={otherPhotoUrl ?? null} name={name ?? '?'} size="sm" />
          <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {name ?? 'Chat'}
          </Text>
        </View>
        {otherUserId != null ? (
          <TouchableOpacity onPress={() => setShowReport(true)} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.reportIcon, { color: theme.text.secondary }]}>{'⋯'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {isPending && isCurrentUserSender && (
        <View style={[styles.requestBanner, { backgroundColor: theme.bg.elevated, borderBottomColor: theme.border.default }]}>
          <Text style={[styles.bannerText, { color: theme.text.secondary }]}>
            {remaining > 0
              ? `${remaining} of 3 messages remaining`
              : `Waiting for ${name ?? 'them'} to accept your request`}
          </Text>
          <View style={styles.dotsRow}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i <= usedMessages ? theme.brand.primary : theme.border.default }]}
              />
            ))}
          </View>
        </View>
      )}

      {isPending && isCurrentUserReceiver && (
        <View style={[styles.requestBanner, { backgroundColor: theme.bg.elevated, borderBottomColor: theme.border.default }]}>
          <Text style={[styles.bannerText, { color: theme.text.primary, fontWeight: '600' }]}>
            {chatRequest?.sender.name} wants to connect
          </Text>
          <Text style={[styles.bannerText, { color: theme.text.secondary, marginBottom: 10 }]}>
            Applied to a job posting
          </Text>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#D85A30' }]}
              onPress={() => void handleAccept()}
              disabled={isRespondingRequest}
              activeOpacity={0.8}
            >
              <Text style={[styles.acceptBtnText, { color: theme.text.inverse }]}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: theme.border.subtle }]}
              onPress={() => void handleDecline()}
              disabled={isRespondingRequest}
              activeOpacity={0.8}
            >
              <Text style={[styles.declineBtnText, { color: theme.text.secondary }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

        {typingVisible && othersTyping.length > 0 && (
          <View style={styles.typingRow}>
            <Text style={[styles.typingText, { color: theme.text.secondary }]}>
              {name} is typing…
            </Text>
          </View>
        )}

        <View style={[styles.inputRow, { borderTopColor: theme.border.default, backgroundColor: theme.bg.surface, paddingBottom: Math.max(bottom, 12) }]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { backgroundColor: theme.bg.elevated, color: theme.text.primary },
              inputDisabled && { opacity: 0.4 },
            ]}
            value={draft}
            onChangeText={handleChangeText}
            onBlur={() => setTyping(false)}
            placeholder={
              isReceiverPending
                ? 'Accept the request to reply'
                : isBlocked
                  ? `Waiting for ${name ?? 'them'} to accept…`
                  : 'Type a message…'
            }
            placeholderTextColor={theme.text.secondary}
            multiline
            maxLength={2000}
            keyboardAppearance="dark"
            editable={!inputDisabled}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: draft.trim() && !inputDisabled ? theme.brand.primary : theme.bg.elevated }]}
            onPress={() => void handleSend()}
            activeOpacity={0.8}
            disabled={!draft.trim() || inputDisabled || isSending}
          >
            <Text style={[styles.sendIcon, { color: theme.text.inverse }]}>↑</Text>
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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },

  requestBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bannerText: { fontSize: 13, lineHeight: 18 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700' },
  declineBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineBtnText: { fontSize: 14, fontWeight: '600' },

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
  sendIcon: { fontSize: 18, fontWeight: '700' },
  reportIcon: { fontSize: 20, fontWeight: '700' },
  systemMsgRow: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24 },
  systemBubble: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  systemText: { fontSize: 12, textAlign: 'center' },
})
