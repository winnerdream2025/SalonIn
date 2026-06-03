import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { reportsApi, chatRequestsApi } from '@salonin/api-client'
import { useMessages } from '../../hooks/useMessages'
import { useAuthStore } from '../../store/authStore'
import type { ChatRequestPreview } from '@salonin/types'

const SKELETON_COUNT = 8
const TYPING_TIMEOUT_MS = 3000

export default function ChatScreen() {
  const { bottom } = useSafeAreaInsets()
  const { theme } = useTheme()
  const { id, name, otherUserId, chatRequestId } = useLocalSearchParams<{
    id: string
    name: string
    otherUserId?: string
    chatRequestId?: string
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
  } = useMessages(id)

  const [draft, setDraft] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [chatRequest, setChatRequest] = useState<ChatRequestPreview | null>(null)
  const [isRespondingRequest, setIsRespondingRequest] = useState(false)
  const [typingVisible, setTypingVisible] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)

  const isCurrentUserSender = chatRequest?.senderId === currentUserId
  const isCurrentUserReceiver = chatRequest?.receiverId === currentUserId
  const isPending = chatRequest?.status === 'PENDING'
  const isBlocked =
    isPending && isCurrentUserSender && (chatRequest?.messageCount ?? 0) >= 3
  const inputDisabled = isBlocked

  useEffect(() => {
    if (!chatRequestId) return
    chatRequestsApi.getReceived().then((list) => {
      const found = list.find((r) => r.id === chatRequestId)
      if (found) setChatRequest(found)
    }).catch(() => undefined)
  }, [chatRequestId])

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
    if (!text || inputDisabled) return
    setDraft('')
    setTyping(false)
    await sendMessage(text)
    if (chatRequest?.status === 'PENDING' && isCurrentUserSender) {
      setChatRequest((prev) =>
        prev ? { ...prev, messageCount: (prev.messageCount ?? 0) + 1 } : prev,
      )
    }
  }, [draft, sendMessage, setTyping, inputDisabled, chatRequest, isCurrentUserSender])

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

      {isPending && isCurrentUserSender && (
        <View style={[styles.requestBanner, { backgroundColor: theme.bg.elevated, borderBottomColor: theme.border.default }]}>
          {isBlocked ? (
            <Text style={[styles.bannerText, { color: theme.text.secondary }]}>
              Waiting for {name} to accept your request
            </Text>
          ) : (
            <>
              <Text style={[styles.bannerText, { color: theme.text.secondary }]}>
                Chat request pending — {chatRequest?.messageCount ?? 0}/3 messages used
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.border.default }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: '#D85A30',
                      width: `${((chatRequest?.messageCount ?? 0) / 3) * 100}%`,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      )}

      {isPending && isCurrentUserReceiver && chatRequest?.status === 'PENDING' && (
        <View style={[styles.requestBanner, { backgroundColor: theme.bg.elevated, borderBottomColor: theme.border.default }]}>
          <Text style={[styles.bannerText, { color: theme.text.primary, fontWeight: '600', marginBottom: 10 }]}>
            {chatRequest.sender.name} wants to chat
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
            placeholder={inputDisabled ? `Waiting for ${name} to accept…` : 'Type a message…'}
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
            disabled={!draft.trim() || inputDisabled}
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
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },

  requestBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bannerText: { fontSize: 13, lineHeight: 18 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },
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
})
