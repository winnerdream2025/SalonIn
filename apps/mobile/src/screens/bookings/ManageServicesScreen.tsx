import React, { useState, useCallback, useEffect } from 'react'
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
  Switch,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import {
  useMyProviderId,
  useProviderServices,
  useServiceActions,
} from '../../services/booking/booking.hooks'
import type { ProviderService } from '../../services/booking/booking.types'
import { DURATION_OPTIONS, durationLabel } from '../../config/serviceCatalog'
import { pendingServicePrefill } from '../../utils/pendingServicePrefill'

const ADDON_CATEGORY = '__addon__'

// ── Duration picker ───────────────────────────────────────────────────────────

function DurationPicker({
  visible,
  value,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean
  value: number
  onSelect: (v: number) => void
  onClose: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={styles.pickerBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.pickerSheet, { backgroundColor: theme.bg.surface }]}>
          <View style={[styles.pickerHandle, { backgroundColor: theme.border.subtle }]} />
          <Text style={[styles.pickerTitle, { color: theme.text.primary }]}>Duration</Text>
          <FlatList
            data={DURATION_OPTIONS}
            keyExtractor={(item) => String(item.value)}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item.value); onClose() }}
                style={[
                  styles.pickerRow,
                  item.value === value && { backgroundColor: 'rgba(216,90,48,0.06)' },
                  { borderBottomColor: theme.border.subtle },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerRowText, { color: theme.text.primary }]}>
                  {item.label}
                </Text>
                {item.value === value && (
                  <Ionicons name="checkmark" size={18} color="#D85A30" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

// ── Add a Service form modal ──────────────────────────────────────────────────

export interface ServiceFormInit {
  name: string
  description: string
  duration: number
  price: string
  priceAndUp: boolean
  requireDeposit: boolean
  depositAmount: string
  certainDaysOnly: boolean
  category: string
  isAddOn: boolean
}

const EMPTY_FORM: ServiceFormInit = {
  name: '',
  description: '',
  duration: 60,
  price: '',
  priceAndUp: false,
  requireDeposit: false,
  depositAmount: '',
  certainDaysOnly: false,
  category: '',
  isAddOn: false,
}

function ServiceFormModal({
  visible,
  initial,
  editingId,
  onClose,
  onSaved,
  onDeleted,
  theme,
}: {
  visible: boolean
  initial: ServiceFormInit
  editingId: string | null
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const { top } = useSafeAreaInsets()
  const { create, update, remove, isWorking } = useServiceActions()
  const [form, setForm] = useState<ServiceFormInit>(initial)
  const [durationPickerVisible, setDurationPickerVisible] = useState(false)

  useEffect(() => { if (visible) setForm(initial) }, [visible, initial])

  const set = useCallback(<K extends keyof ServiceFormInit>(key: K, value: ServiceFormInit[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    const category = form.isAddOn ? ADDON_CATEGORY : (form.category || undefined)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      duration: form.duration,
      price: form.price ? parseFloat(form.price) : 0,
      depositAmount: form.requireDeposit && form.depositAmount ? parseFloat(form.depositAmount) : undefined,
      category,
    }
    let ok = false
    if (editingId) {
      ok = await update(editingId, payload)
    } else {
      const svc = await create(payload)
      ok = svc != null
    }
    if (ok) { onSaved(); onClose() }
  }

  const handleDelete = () => {
    if (!editingId) return
    Alert.alert(
      'Remove Service',
      'Remove this service from your menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const ok = await remove(editingId)
            if (ok) { onDeleted?.(); onClose() }
          },
        },
      ],
    )
  }

  const isEdit = editingId != null

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.formRoot, { backgroundColor: theme.bg.base }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.formHeader, { paddingTop: top + 4, borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={theme.text.secondary} />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: theme.text.primary }]}>
              {isEdit ? 'Edit Service' : form.isAddOn ? 'Add an Add-On' : 'Add a Service'}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <View style={[styles.formSection, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.formLabel, { color: theme.text.tertiary }]}>Service Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Box Braids"
                placeholderTextColor={theme.text.tertiary}
                style={[styles.formInput, { color: theme.text.primary }]}
                returnKeyType="done"
                autoFocus={!isEdit && !form.name}
              />
            </View>

            {/* Price */}
            <View style={[styles.formSection, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.formLabel, { color: theme.text.tertiary }]}>Price</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: theme.text.primary }]}>$</Text>
                <TextInput
                  value={form.price}
                  onChangeText={(v) => set('price', v.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  style={[styles.priceInput, { color: theme.text.primary }]}
                />
              </View>
            </View>

            {/* And Up toggle */}
            <View style={[styles.toggleRow, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>And Up</Text>
                <Text style={[styles.toggleSub, { color: theme.text.tertiary }]}>
                  Price shown as a starting rate
                </Text>
              </View>
              <Switch
                value={form.priceAndUp}
                onValueChange={(v) => set('priceAndUp', v)}
                trackColor={{ false: theme.border.default, true: '#D85A30' }}
                thumbColor="#fff"
              />
            </View>

            {/* Duration */}
            <TouchableOpacity
              onPress={() => setDurationPickerVisible(true)}
              style={[styles.toggleRow, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>Duration</Text>
              <View style={styles.durationRight}>
                <Text style={[styles.durationValue, { color: theme.text.secondary }]}>
                  {durationLabel(form.duration)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.text.tertiary} />
              </View>
            </TouchableOpacity>

            {/* Require Deposit */}
            <View style={[styles.toggleRow, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
              <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>Require Deposit</Text>
              <Switch
                value={form.requireDeposit}
                onValueChange={(v) => set('requireDeposit', v)}
                trackColor={{ false: theme.border.default, true: '#D85A30' }}
                thumbColor="#fff"
              />
            </View>
            {form.requireDeposit && (
              <View style={[styles.formSection, { borderBottomColor: theme.border.subtle }]}>
                <Text style={[styles.formLabel, { color: theme.text.tertiary }]}>Deposit Amount</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceCurrency, { color: theme.text.primary }]}>$</Text>
                  <TextInput
                    value={form.depositAmount}
                    onChangeText={(v) => set('depositAmount', v.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                    style={[styles.priceInput, { color: theme.text.primary }]}
                  />
                </View>
              </View>
            )}

            {/* Available Certain Days */}
            <View style={[styles.toggleRow, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>
                  This Service Is Only Available On Certain Days
                </Text>
              </View>
              <Switch
                value={form.certainDaysOnly}
                onValueChange={(v) => set('certainDaysOnly', v)}
                trackColor={{ false: theme.border.default, true: '#D85A30' }}
                thumbColor="#fff"
              />
            </View>

            {/* Description */}
            <View style={[styles.formSection, { borderBottomColor: theme.border.subtle }]}>
              <Text style={[styles.formLabel, { color: theme.text.tertiary }]}>Description</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Describe this service to your clients..."
                placeholderTextColor={theme.text.tertiary}
                multiline
                numberOfLines={4}
                style={[styles.formInput, { color: theme.text.primary, minHeight: 80, textAlignVertical: 'top' }]}
              />
            </View>

            {/* Save button */}
            <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isWorking || !form.name.trim()}
                style={[
                  styles.saveBtn,
                  { backgroundColor: form.name.trim() ? '#D85A30' : theme.border.default },
                ]}
                activeOpacity={0.85}
              >
                {isWorking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>Remove Service</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <DurationPicker
        visible={durationPickerVisible}
        value={form.duration}
        onSelect={(v) => set('duration', v)}
        onClose={() => setDurationPickerVisible(false)}
        theme={theme}
      />
    </>
  )
}

// ── Add Type bottom sheet ─────────────────────────────────────────────────────

function AddTypeSheet({
  visible,
  onClose,
  onService,
  onAddOn,
  theme,
}: {
  visible: boolean
  onClose: () => void
  onService: () => void
  onAddOn: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const { bottom } = useSafeAreaInsets()

  const OPTIONS = [
    {
      icon: 'cut-outline' as const,
      title: 'Service',
      sub: 'A service you offer that clients book time for',
      onPress: onService,
    },
    {
      icon: 'add-circle-outline' as const,
      title: 'Add-On',
      sub: 'A add-on to a service, like adding a treatment',
      onPress: onAddOn,
    },
    {
      icon: 'folder-outline' as const,
      title: 'Service Categories',
      sub: 'Group your services by category',
      onPress: () => {
        onClose()
        Alert.alert('Coming Soon', 'Service category grouping will be available soon.')
      },
    },
    {
      icon: 'layers-outline' as const,
      title: 'Combined Service',
      sub: 'A service bundled with add-ons at a set price',
      onPress: () => {
        onClose()
        Alert.alert('Coming Soon', 'Combined services will be available soon.')
      },
    },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: theme.bg.surface, paddingBottom: bottom + 8 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border.subtle }]} />
          <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>
            Add To Service Menu
          </Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.title}
              onPress={() => { onClose(); opt.onPress() }}
              style={[styles.sheetRow, { borderBottomColor: theme.border.subtle }]}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconWrap, { backgroundColor: 'rgba(216,90,48,0.08)' }]}>
                <Ionicons name={opt.icon} size={20} color="#D85A30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetRowTitle, { color: theme.text.primary }]}>{opt.title}</Text>
                <Text style={[styles.sheetRowSub, { color: theme.text.tertiary }]}>{opt.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  )
}

// ── Single service row ────────────────────────────────────────────────────────

function ServiceRow({
  item,
  onPress,
  theme,
}: {
  item: ProviderService
  onPress: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const priceText = item.price > 0
    ? `$${item.price}${item.price % 1 === 0 ? '' : ''} and up`
    : 'Price TBD'
  const dur = durationLabel(item.duration)

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.serviceRow, { borderBottomColor: theme.border.subtle }]}
      activeOpacity={0.7}
    >
      <Ionicons name="reorder-three" size={22} color={theme.text.tertiary} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.serviceRowName, { color: theme.text.primary }]}>{item.name}</Text>
        <Text style={[styles.serviceRowSub, { color: theme.text.tertiary }]}>
          {priceText} · {dur}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
    </TouchableOpacity>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

type MenuTab = 'services' | 'addons'

export default function ManageServicesScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const { providerId, providerType, isLoading: providerLoading } = useMyProviderId()
  const { services, isLoading, error, refetch } = useProviderServices(providerId, providerType)

  const [menuTab, setMenuTab] = useState<MenuTab>('services')
  const [addSheetVisible, setAddSheetVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [formInitial, setFormInitial] = useState<ServiceFormInit>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Check for pending prefill from ServiceCatalogScreen
  useFocusEffect(
    useCallback(() => {
      const prefill = pendingServicePrefill.consume()
      if (prefill) {
        setFormInitial({
          ...EMPTY_FORM,
          name: prefill.name,
          category: prefill.category,
          isAddOn: prefill.isAddOn ?? false,
        })
        setEditingId(null)
        setFormVisible(true)
      }
    }, []),
  )

  const regularServices = services.filter((s) => s.category !== ADDON_CATEGORY)
  const addOns = services.filter((s) => s.category === ADDON_CATEGORY)
  const displayed = menuTab === 'services' ? regularServices : addOns

  const openAddSheet = () => setAddSheetVisible(true)

  const openCatalog = () => {
    router.push('/manage-services/catalog' as never)
  }

  const openNewAddOn = () => {
    setFormInitial({ ...EMPTY_FORM, isAddOn: true })
    setEditingId(null)
    setFormVisible(true)
  }

  const openEdit = (svc: ProviderService) => {
    setFormInitial({
      name: svc.name,
      description: svc.description ?? '',
      duration: svc.duration,
      price: svc.price > 0 ? String(svc.price) : '',
      priceAndUp: false,
      requireDeposit: !!svc.depositAmount,
      depositAmount: svc.depositAmount ? String(svc.depositAmount) : '',
      certainDaysOnly: false,
      category: svc.category ?? '',
      isAddOn: svc.category === ADDON_CATEGORY,
    })
    setEditingId(svc.id)
    setFormVisible(true)
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: top + 10, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Service Menu</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* ── Services & Add-ons toggle + Add button ── */}
      <View style={[styles.toolbar, { backgroundColor: theme.bg.base, borderBottomColor: theme.border.subtle }]}>
        <View style={[styles.segmentWrap, { backgroundColor: theme.bg.elevated }]}>
          <TouchableOpacity
            onPress={() => setMenuTab('services')}
            style={[styles.segment, menuTab === 'services' && { backgroundColor: theme.bg.surface }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: menuTab === 'services' ? theme.text.primary : theme.text.tertiary }]}>
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuTab('addons')}
            style={[styles.segment, menuTab === 'addons' && { backgroundColor: theme.bg.surface }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: menuTab === 'addons' ? theme.text.primary : theme.text.tertiary }]}>
              Add-ons
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={openAddSheet}
          style={[styles.addBtn, { borderColor: '#D85A30' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#D85A30" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {isLoading || providerLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D85A30" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={[styles.retryBtn, { borderColor: theme.border.default }]}>
            <Text style={{ color: theme.text.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={menuTab === 'services' ? 'cut-outline' : 'add-circle-outline'}
            size={48}
            color={theme.text.tertiary}
          />
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
            {menuTab === 'services' ? 'No services yet' : 'No add-ons yet'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            {menuTab === 'services'
              ? 'Add your first service so clients can book with you.'
              : 'Add-ons are extras clients can include with a service.'}
          </Text>
          <TouchableOpacity
            onPress={menuTab === 'services' ? openCatalog : openNewAddOn}
            style={styles.emptyAddBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyAddBtnText}>
              {menuTab === 'services' ? '+ Browse Services' : '+ Add an Add-On'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <View style={[styles.sectionLabel, { borderLeftColor: '#D85A30' }]}>
            <Text style={[styles.sectionLabelText, { color: theme.text.tertiary }]}>
              Default
            </Text>
          </View>

          {displayed.map((svc) => (
            <ServiceRow
              key={svc.id}
              item={svc}
              onPress={() => openEdit(svc)}
              theme={theme}
            />
          ))}

          {/* Long-press hint */}
          <Text style={[styles.hint, { color: theme.text.tertiary }]}>
            Tap a service to edit · Swipe to delete
          </Text>
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <AddTypeSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onService={openCatalog}
        onAddOn={openNewAddOn}
        theme={theme}
      />

      <ServiceFormModal
        visible={formVisible}
        initial={formInitial}
        editingId={editingId}
        onClose={() => setFormVisible(false)}
        onSaved={refetch}
        onDeleted={refetch}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  segmentWrap: {
    flex: 1, flexDirection: 'row', borderRadius: 10,
    padding: 3, height: 36,
  },
  segment: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnText: { color: '#D85A30', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
  emptyAddBtn: {
    marginTop: 20, backgroundColor: '#D85A30', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionLabel: {
    borderLeftWidth: 3, marginLeft: 16, paddingLeft: 8, marginTop: 16, marginBottom: 4,
  },
  sectionLabelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceRowName: { fontSize: 15, fontWeight: '600' },
  serviceRowSub: { fontSize: 12, marginTop: 2 },
  hint: { textAlign: 'center', fontSize: 11, marginTop: 16, marginBottom: 8 },
  // Bottom sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetRowTitle: { fontSize: 15, fontWeight: '600' },
  sheetRowSub: { fontSize: 12, marginTop: 2 },
  // Service form modal
  formRoot: { flex: 1 },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formTitle: { fontSize: 17, fontWeight: '700' },
  formSection: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  formLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  formInput: { fontSize: 16, paddingVertical: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCurrency: { fontSize: 20, fontWeight: '300' },
  priceInput: { flex: 1, fontSize: 20, paddingVertical: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  durationRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationValue: { fontSize: 15 },
  saveBtn: {
    borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  deleteBtnText: { color: '#E24B4A', fontSize: 15, fontWeight: '600' },
  // Duration picker
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 32 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { fontSize: 16 },
})
