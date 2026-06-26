import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useMyProviderId, useProviderServices, useServiceActions } from '../../services/booking/booking.hooks'
import type { ProviderService } from '../../services/booking/booking.types'

const DURATION_PRESETS = [30, 45, 60, 90, 120, 180, 240]
const CATEGORIES = ['Braids', 'Locs', 'Natural', 'Color', 'Cuts', 'Extensions', 'Nails', 'Skincare', 'Makeup', 'Other']

interface ServiceFormState {
  name: string
  description: string
  duration: string
  flatPrice: string
  depositAmount: string
  bufferBefore: string
  bufferAfter: string
  category: string
}

const EMPTY_FORM: ServiceFormState = { name: '', description: '', duration: '60', flatPrice: '', depositAmount: '', bufferBefore: '0', bufferAfter: '0', category: '' }

function ServiceCard({
  item,
  onEdit,
  onDelete,
  theme,
}: {
  item: ProviderService
  onEdit: (s: ProviderService) => void
  onDelete: (s: ProviderService) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const mins = item.duration
  const durationLabel = mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
    : `${mins}m`

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>{item.name}</Text>
          {item.category ? (
            <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>{item.category}</Text>
          ) : null}
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.badge, { backgroundColor: 'rgba(216,90,48,0.1)' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#D85A30' }}>
              {item.price > 0 ? `$${item.price}` : 'Price TBD'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.bg.elevated }]}>
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>{durationLabel}</Text>
          </View>
          {item.depositAmount ? (
            <View style={[styles.badge, { backgroundColor: 'rgba(29,158,117,0.1)' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1D9E75' }}>
                ${item.depositAmount} dep.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {item.description ? (
        <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 6 }}>
          {item.description}
        </Text>
      ) : null}
      <View style={[styles.cardActions, { borderTopColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={14} color={theme.text.secondary} />
          <Text style={{ fontSize: 13, color: theme.text.secondary, marginLeft: 4 }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={14} color="#E24B4A" />
          <Text style={{ fontSize: 13, color: '#E24B4A', marginLeft: 4 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function ServiceFormModal({
  visible,
  initial,
  onClose,
  onSave,
  isSaving,
  theme,
}: {
  visible: boolean
  initial: ServiceFormState
  onClose: () => void
  onSave: (form: ServiceFormState) => void
  isSaving: boolean
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [form, setForm] = useState<ServiceFormState>(initial)
  const insets = useSafeAreaInsets()

  React.useEffect(() => { setForm(initial) }, [initial])

  const set = (key: keyof ServiceFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: theme.bg.base }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 15, color: theme.text.secondary }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>
            {initial.name ? 'Edit Service' : 'New Service'}
          </Text>
          <TouchableOpacity
            onPress={() => onSave(form)}
            disabled={isSaving || !form.name.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#D85A30" />
              : <Text style={{ fontSize: 15, fontWeight: '700', color: form.name.trim() ? '#D85A30' : theme.text.tertiary }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Service Name *</Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder="e.g. Box Braids"
            placeholderTextColor={theme.text.tertiary}
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Brief description..."
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={3}
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary, height: 80, textAlignVertical: 'top' }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Duration (minutes) *</Text>
          <View style={styles.chipsRow}>
            {DURATION_PRESETS.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => set('duration', String(d))}
                style={[styles.chip, { borderColor: form.duration === String(d) ? '#D85A30' : theme.border.default, backgroundColor: form.duration === String(d) ? 'rgba(216,90,48,0.1)' : theme.bg.surface }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: form.duration === String(d) ? '#D85A30' : theme.text.secondary }}>
                  {d >= 60 ? `${d / 60}h${d % 60 ? `${d % 60}m` : ''}` : `${d}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={form.duration}
            onChangeText={(v) => set('duration', v.replace(/[^0-9]/g, ''))}
            placeholder="Custom minutes"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Price (USD)</Text>
          <TextInput
            value={form.flatPrice}
            onChangeText={(v) => set('flatPrice', v.replace(/[^0-9.]/g, ''))}
            placeholder="e.g. 150"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Deposit Amount (optional)</Text>
          <TextInput
            value={form.depositAmount}
            onChangeText={(v) => set('depositAmount', v.replace(/[^0-9.]/g, ''))}
            placeholder="e.g. 25 (leave blank for none)"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
          />

          <Text style={[styles.label, { color: theme.text.secondary }]}>Buffer Time (minutes)</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginBottom: 4 }}>Before</Text>
              <TextInput
                value={form.bufferBefore}
                onChangeText={(v) => set('bufferBefore', v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginBottom: 4 }}>After</Text>
              <TextInput
                value={form.bufferAfter}
                onChangeText={(v) => set('bufferAfter', v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.text.secondary }]}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => set('category', form.category === cat ? '' : cat)}
                style={[styles.chip, { borderColor: form.category === cat ? '#D85A30' : theme.border.default, backgroundColor: form.category === cat ? 'rgba(216,90,48,0.1)' : theme.bg.surface }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: form.category === cat ? '#D85A30' : theme.text.secondary }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function ManageServicesScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const { providerId, providerType, isLoading: providerLoading } = useMyProviderId()
  const { services, isLoading, error, refetch } = useProviderServices(providerId, providerType)
  const { create, update, remove, isWorking } = useServiceActions()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingService, setEditingService] = useState<ProviderService | null>(null)
  const [formInitial, setFormInitial] = useState<ServiceFormState>(EMPTY_FORM)

  const handleAddNew = () => {
    setEditingService(null)
    setFormInitial(EMPTY_FORM)
    setModalVisible(true)
  }

  const handleEdit = (svc: ProviderService) => {
    setEditingService(svc)
    setFormInitial({
      name: svc.name,
      description: svc.description ?? '',
      duration: String(svc.duration),
      flatPrice: svc.price > 0 ? String(svc.price) : '',
      depositAmount: svc.depositAmount ? String(svc.depositAmount) : '',
      bufferBefore: svc.bufferBefore ? String(svc.bufferBefore) : '0',
      bufferAfter: svc.bufferAfter ? String(svc.bufferAfter) : '0',
      category: svc.category ?? '',
    })
    setModalVisible(true)
  }

  const handleDelete = useCallback((svc: ProviderService) => {
    Alert.alert(
      'Delete Service',
      `Remove "${svc.name}" from your booking menu? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await remove(svc.id)
            if (ok) refetch()
          },
        },
      ],
    )
  }, [remove, refetch])

  const handleSave = useCallback(async (form: ServiceFormState) => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      duration: parseInt(form.duration, 10) || 60,
      price: form.flatPrice ? parseFloat(form.flatPrice) : 0,
      depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
      bufferBefore: parseInt(form.bufferBefore, 10) || 0,
      bufferAfter: parseInt(form.bufferAfter, 10) || 0,
      category: form.category || undefined,
    }

    if (editingService) {
      const ok = await update(editingService.id, payload)
      if (ok) { setModalVisible(false); refetch() }
    } else {
      const svc = await create(payload)
      if (svc) { setModalVisible(false); refetch() }
    }
  }, [editingService, create, update, refetch])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>My Services</Text>
        <TouchableOpacity onPress={handleAddNew} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add-circle" size={26} color="#D85A30" />
        </TouchableOpacity>
      </View>

      {isLoading || providerLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D85A30" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 8, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={[styles.retryBtn, { borderColor: theme.border.default }]}>
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : services.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cut-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary, marginTop: 12 }}>No services yet</Text>
          <Text style={{ fontSize: 14, color: theme.text.secondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            Add your first service so clients can book with you.
          </Text>
          <TouchableOpacity onPress={handleAddNew} style={styles.addFirstBtn} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Add Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 13, color: theme.text.tertiary, marginBottom: 12 }}>
            {services.length} service{services.length !== 1 ? 's' : ''} — clients see these when booking
          </Text>
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              item={svc}
              onEdit={handleEdit}
              onDelete={handleDelete}
              theme={theme}
            />
          ))}
          <TouchableOpacity onPress={handleAddNew} style={[styles.addMoreBtn, { borderColor: '#D85A30' }]} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#D85A30" />
            <Text style={{ color: '#D85A30', fontWeight: '700', marginLeft: 6 }}>Add Another Service</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ServiceFormModal
        visible={modalVisible}
        initial={formInitial}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        isSaving={isWorking}
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
  card: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardBadges: { alignItems: 'flex-end', gap: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardActions: {
    flexDirection: 'row', gap: 16, marginTop: 10,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
  addFirstBtn: {
    marginTop: 20, backgroundColor: '#D85A30', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 24,
  },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, marginTop: 4, borderStyle: 'dashed',
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
})
