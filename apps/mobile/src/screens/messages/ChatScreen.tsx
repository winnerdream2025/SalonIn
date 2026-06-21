import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { VoiceRecorder } from '../../components/VoiceRecorder'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme, MessageBubble, MessageBubbleSkeleton, ReportModal, Avatar } from '@salonin/ui'
import type { Message } from '@salonin/types'
import { formatLastSeen } from '@salonin/utils'
import { reportsApi, chatRequestsApi, parseApiError } from '@salonin/api-client'
import { useMessages } from '../../hooks/useMessages'
import { useAuthStore } from '../../store/authStore'

const SKELETON_COUNT = 8
const TYPING_TIMEOUT_MS = 2000

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
    editMessage,
    deleteMessage,
    reactToMessage,
    loadMore,
    typingUsers,
    setTyping,
    chatRequest,
    setChatRequest,
    presence,
  } = useMessages(id, otherUserId)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [isRespondingRequest, setIsRespondingRequest] = useState(false)
  const [typingVisible, setTypingVisible] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
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
      if (editingMessage) {
        await editMessage(editingMessage.id, text)
        setEditingMessage(null)
      } else {
        await sendMessage(text, undefined, replyingTo?.id)
        setReplyingTo(null)
      }
    } catch (e: unknown) {
      setDraft(text)
      Alert.alert('Message not sent', parseApiError(e))
    } finally {
      setIsSending(false)
    }
  }, [draft, sendMessage, editMessage, setTyping, inputDisabled, isSending, replyingTo, editingMessage])

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
          currentUserId={currentUserId}
          onLongPress={(msg) => {
            setSelectedMessage(msg)
            setShowActionMenu(true)
          }}
          onPressReaction={(emoji) => {
            if (item.isDeletedForAll) return
            void reactToMessage(item.id, emoji)
          }}
        />
      )
    },
    [currentUserId, messages, otherPhotoUrl, name, theme, reactToMessage],
  )

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={theme.brand.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar uri={otherPhotoUrl ?? null} name={name ?? '?'} size="sm" />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
              {name ?? 'Chat'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
              {presence?.isOnline ? 'Online' : formatLastSeen(presence?.lastSeenAt)}
            </Text>
          </View>
        </View>
        {otherUserId != null ? (
          <TouchableOpacity onPress={() => setShowReport(true)} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.text.secondary} />
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

        {(replyingTo || editingMessage) && (
          <View style={[styles.composerBanner, { borderTopColor: theme.border.default, backgroundColor: theme.bg.card }]}>
            <View style={styles.flex}>
              <Text style={[styles.composerBannerLabel, { color: theme.brand.primary }]}>
                {editingMessage ? 'Editing' : 'Replying to'} {replyingTo?.senderId === currentUserId ? 'yourself' : name ?? 'User'}
              </Text>
              <Text style={[styles.composerBannerText, { color: theme.text.secondary }]} numberOfLines={1}>
                {editingMessage ? editingMessage.content : replyingTo?.content ?? 'Media'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo(null)
                setEditingMessage(null)
              }}
              style={styles.composerBannerClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>
        )}

        {showVoiceRecorder ? (
          <VoiceRecorder
            onSend={async (audioUrl, duration, waveformData) => {
              setShowVoiceRecorder(false)
              setIsSending(true)
              try {
                await sendMessage('', undefined, replyingTo?.id, audioUrl, duration, waveformData)
                setReplyingTo(null)
              } catch (e: unknown) {
                Alert.alert('Voice message not sent', 'Please try again.')
              } finally {
                setIsSending(false)
              }
            }}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <View style={[styles.inputRow, { borderTopColor: theme.border.default, backgroundColor: theme.bg.card, paddingBottom: Math.max(bottom, 12) }]}>
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
              keyboardAppearance="light"
              editable={!inputDisabled}
            />
            {draft.trim() ? (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: !inputDisabled ? theme.brand.primary : theme.bg.elevated }]}
                onPress={() => void handleSend()}
                activeOpacity={0.8}
                disabled={inputDisabled || isSending}
              >
                <Ionicons name="send" size={16} color={!inputDisabled ? '#FFFFFF' : theme.text.tertiary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: !inputDisabled ? theme.bg.elevated : theme.bg.elevated }]}
                onPress={() => {
                  if (!inputDisabled) setShowVoiceRecorder(true)
                }}
                activeOpacity={0.8}
                disabled={inputDisabled}
              >
                <Ionicons name="mic" size={18} color={!inputDisabled ? theme.brand.primary : theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
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

      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: theme.bg.card }]}
            pointerEvents="box-none"
          >
            <View style={[styles.actionSheetHeader, { borderBottomColor: theme.border.default }]}>
              <Text style={[styles.actionSheetTitle, { color: theme.text.primary }]}>
                Message options
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (selectedMessage) {
                  setReplyingTo(selectedMessage)
                  setShowActionMenu(false)
                }
              }}
              style={styles.actionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={22} color={theme.text.primary} />
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowActionMenu(false)
                setShowReactionPicker(true)
              }}
              style={styles.actionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="happy-outline" size={22} color={theme.text.primary} />
              <Text style={[styles.actionText, { color: theme.text.primary }]}>React</Text>
            </TouchableOpacity>
            {selectedMessage && selectedMessage.senderId === currentUserId && !selectedMessage.isDeletedForAll && (
              <TouchableOpacity
                onPress={() => {
                  setEditingMessage(selectedMessage)
                  setDraft(selectedMessage.content ?? '')
                  setShowActionMenu(false)
                  inputRef.current?.focus()
                }}
                style={styles.actionRow}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={22} color={theme.text.primary} />
                <Text style={[styles.actionText, { color: theme.text.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {selectedMessage && !selectedMessage.isDeletedForAll && (
              <TouchableOpacity
                onPress={() => {
                  setShowActionMenu(false)
                  const isOwn = selectedMessage.senderId === currentUserId
                  Alert.alert(
                    'Delete message',
                    isOwn ? 'Delete this message for everyone or just for you?' : 'Delete this message for you?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete for me', style: 'destructive', onPress: () => void deleteMessage(selectedMessage.id, 'me') },
                      ...(isOwn
                        ? [{ text: 'Delete for all', style: 'destructive', onPress: () => void deleteMessage(selectedMessage.id, 'all') } as const]
                        : []),
                    ],
                  )
                }}
                style={styles.actionRow}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={22} color={theme.semantic.error.text} />
                <Text style={[styles.actionText, { color: theme.semantic.error.text }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showReactionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        >
          <View style={[styles.reactionPicker, { backgroundColor: theme.bg.card }]}>
            <View style={styles.reactionRow}>
              {['❤️', '👍', '😂', '😮', '😢', '🔥'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    if (selectedMessage) {
                      void reactToMessage(selectedMessage.id, emoji)
                    }
                    setShowReactionPicker(false)
                    setSelectedMessage(null)
                  }}
                  style={styles.reactionOption}
                  activeOpacity={0.6}
                >
                  <Text style={styles.reactionOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerText: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  requestBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700' },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineBtnText: { fontSize: 14, fontWeight: '600' },

  listContent: { paddingVertical: 12, paddingBottom: 4 },
  moreLoader: { padding: 12 },

  typingRow: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 13, fontStyle: 'italic' },

  composerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  composerBannerLabel: { fontSize: 12, fontWeight: '700' },
  composerBannerText: { fontSize: 13, marginTop: 1 },
  composerBannerClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
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
  systemMsgRow: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24 },
  systemBubble: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  systemText: { fontSize: 12, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  actionSheet: {
    margin: 16,
    borderRadius: 18,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  actionSheetHeader: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionSheetTitle: { fontSize: 14, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionText: { fontSize: 16 },

  reactionPicker: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 12,
  },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  reactionOption: { padding: 10 },
  reactionOptionText: { fontSize: 28 },
})
