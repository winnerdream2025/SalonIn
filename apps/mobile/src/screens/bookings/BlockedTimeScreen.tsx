import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useMyProviderId, useAvailabilityExceptions } from '../../services/booking/booking.hooks'
import type { AvailabilityException } from '../../services/booking/booking.types'

const TIME_SLOTS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
TIME_SLOTS.push('23:00')

function formatTime(t: string): string {
  const [hStr = '0', mStr = '00'] = t.split(':')
  const h = parseInt(hStr, 10)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${suffix}`
}

function formatDateDisplay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function TimePickerInline({
  label,
  value,
  onChange,
  theme,
}: {
  label: string
  value: string
  onChange: (t: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [open, setOpen] = useState(false)
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.tertiary, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={[styles.timePicker, { borderColor: theme.border.default, backgroundColor: theme.bg.surface }]}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>{formatTime(value)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={theme.text.tertiary} />
      </TouchableOpacity>
      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.timeScroll, { backgroundColor: theme.bg.elevated }]}
          contentContainerStyle={{ paddingHorizontal: 6 }}
        >
          {TIME_SLOTS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { onChange(t); setOpen(false) }}
              style={[
                styles.timeChip,
                {
                  backgroundColor: t === value ? '#D85A30' : theme.bg.surface,
                  borderColor: t === value ? '#D85A30' : theme.border.default,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: t === value ? '#fff' : theme.text.secondary }}>
                {formatTime(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

interface AddBlockForm {
  date: string
  fullDay: boolean
  startTime: string
  endTime: string
  reason: string
}

const EMPTY_FORM: AddBlockForm = {
  date: '',
  fullDay: true,
  startTime: '09:00',
  endTime: '17:00',
  reason: '',
}

function AddBlockModal({
  visible,
  onClose,
  onSave,
  isSaving,
  theme,
}: {
  visible: boolean
  onClose: () => void
  onSave: (form: AddBlockForm) => void
  isSaving: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [form, setForm] = useState<AddBlockForm>(EMPTY_FORM)
  const { top } = useSafeAreaInsets()

  const set = <K extends keyof AddBlockForm>(key: K, value: AddBlockForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = () => {
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Enter date as YYYY-MM-DD (e.g. 2024-12-25)')
      return
    }
    onSave(form)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: theme.bg.base }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle, paddingTop: top + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 15, color: theme.text.secondary }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Block Date</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving || !form.date} hitSlop={12}>
            {isSaving
              ? <ActivityIndicator size="small" color="#D85A30" />
              : <Text style={{ fontSize: 15, fontWeight: '700', color: form.date ? '#D85A30' : theme.text.tertiary }}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Date *</Text>
          <TextInput
            value={form.date}
            onChangeText={(v) => set('date', v)}
            placeholder="YYYY-MM-DD (e.g. 2024-12-25)"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Block type</Text>
          <View style={styles.switchRow}>
            <Text style={{ fontSize: 15, color: theme.text.primary, flex: 1 }}>Full day off</Text>
            <Switch
              value={form.fullDay}
              onValueChange={(v) => set('fullDay', v)}
              trackColor={{ false: '#ccc', true: '#D85A30' }}
              thumbColor="#fff"
            />
          </View>

          {!form.fullDay && (
            <>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Blocked hours</Text>
              <View style={styles.timeRow}>
                <TimePickerInline
                  label="From"
                  value={form.startTime}
                  onChange={(t) => set('startTime', t)}
                  theme={theme}
                />
                <View style={{ width: 16, alignItems: 'center', paddingTop: 20 }}>
                  <Text style={{ color: theme.text.tertiary }}>→</Text>
                </View>
                <TimePickerInline
                  label="Until"
                  value={form.endTime}
                  onChange={(t) => set('endTime', t)}
                  theme={theme}
                />
              </View>
            </>
          )}

          <Text style={[styles.label, { color: theme.text.secondary }]}>Reason (optional)</Text>
          <TextInput
            value={form.reason}
            onChangeText={(v) => set('reason', v)}
            placeholder="e.g. Vacation, Holiday, Personal"
            placeholderTextColor={theme.text.tertiary}
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ExceptionRow({
  item,
  onDelete,
  theme,
}: {
  item: AvailabilityException
  onDelete: (id: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[styles.exRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.exIcon}>
        <Ionicons name="ban-outline" size={20} color="#E24B4A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
          {formatDateDisplay(item.date)}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>
          {item.startTime && item.endTime
            ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
            : 'Full day'
          }
          {item.reason ? ` · ${item.reason}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Alert.alert('Remove block?', 'This will restore availability for this date.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onDelete(item.id) },
        ])}
        hitSlop={12}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color="#E24B4A" />
      </TouchableOpacity>
    </View>
  )
}

export default function BlockedTimeScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const { providerId, providerType, isLoading: providerLoading } = useMyProviderId()

  const today = new Date().toISOString().slice(0, 10)
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { exceptions, isLoading, add, remove } = useAvailabilityExceptions(
    providerId,
    providerType,
    today,
    futureDate,
  )

  const [modalVisible, setModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async (form: AddBlockForm) => {
    setIsSaving(true)
    const ok = await add({
      date: form.date,
      startTime: form.fullDay ? undefined : form.startTime,
      endTime: form.fullDay ? undefined : form.endTime,
      reason: form.reason.trim() || undefined,
      isBlocked: true,
    })
    setIsSaving(false)
    if (ok) {
      setModalVisible(false)
      Alert.alert('Blocked', `${form.date} has been blocked.`)
    } else {
      Alert.alert('Error', 'Could not save blocked date. Please try again.')
    }
  }, [add])

  const handleDelete = useCallback(async (id: string) => {
    await remove(id)
  }, [remove])

  const upcoming = exceptions.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Blocked Dates</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={26} color="#D85A30" />
        </TouchableOpacity>
      </View>

      {isLoading || providerLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D85A30" />
        </View>
      ) : upcoming.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary, marginTop: 12 }}>
            No blocked dates
          </Text>
          <Text style={{ fontSize: 14, color: theme.text.secondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            Block vacation days, holidays, or partial hours to prevent bookings.
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Block a Date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 12 }}>
            Upcoming blocked dates (next 90 days)
          </Text>
          {upcoming.map((item) => (
            <ExceptionRow
              key={item.id}
              item={item}
              onDelete={handleDelete}
              theme={theme}
            />
          ))}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.addMoreBtn, { borderColor: '#D85A30' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#D85A30" />
            <Text style={{ color: '#D85A30', fontWeight: '700', marginLeft: 6 }}>Block Another Date</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <AddBlockModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        isSaving={isSaving}
        theme={theme}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  addBtn: {
    marginTop: 20, backgroundColor: '#D85A30', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 24,
  },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, marginTop: 4, borderStyle: 'dashed',
  },
  exRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    padding: 14, marginBottom: 10,
  },
  exIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(226,75,74,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  timePicker: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  timeScroll: { borderRadius: 8, marginTop: 4, paddingVertical: 6, maxHeight: 46 },
  timeChip: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginHorizontal: 3,
  },
})
