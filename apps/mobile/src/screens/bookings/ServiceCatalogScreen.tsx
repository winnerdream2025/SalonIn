import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  ActivityIndicator,
  Switch,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { SERVICE_CATALOG, DURATION_OPTIONS, durationLabel } from '../../config/serviceCatalog'
import { useServiceActions } from '../../services/booking/booking.hooks'
import type { ServiceFormInit } from './ManageServicesScreen'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

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
                <Text style={[styles.pickerRowText, { color: theme.text.primary }]}>{item.label}</Text>
                {item.value === value && <Ionicons name="checkmark" size={18} color="#D85A30" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

// ── Add a Service mini-form (used inline in catalog) ─────────────────────────

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

function CatalogServiceForm({
  visible,
  initial,
  onClose,
  onSaved,
  theme,
}: {
  visible: boolean
  initial: ServiceFormInit
  onClose: () => void
  onSaved: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const { top } = useSafeAreaInsets()
  const { create, isWorking } = useServiceActions()
  const [form, setForm] = useState<ServiceFormInit>(initial)
  const [durationPickerVisible, setDurationPickerVisible] = useState(false)

  React.useEffect(() => { if (visible) setForm(initial) }, [visible, initial])

  const set = useCallback(<K extends keyof ServiceFormInit>(key: K, value: ServiceFormInit[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    const svc = await create({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      duration: form.duration,
      price: form.price ? parseFloat(form.price) : 0,
      depositAmount: form.requireDeposit && form.depositAmount ? parseFloat(form.depositAmount) : undefined,
      category: form.category || undefined,
    })
    if (svc) { onSaved(); onClose() }
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.formRoot, { backgroundColor: theme.bg.base }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.formHeader, { paddingTop: top + 4, borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={theme.text.secondary} />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: theme.text.primary }]}>Add a Service</Text>
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

            {/* And Up */}
            <View style={[styles.toggleRow, { borderBottomColor: theme.border.subtle, backgroundColor: theme.bg.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text.primary }]}>And Up</Text>
                <Text style={[styles.toggleSub, { color: theme.text.tertiary }]}>Price shown as a starting rate</Text>
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

            {/* Certain Days */}
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

            {/* Save */}
            <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isWorking || !form.name.trim()}
                style={[styles.saveBtn, { backgroundColor: form.name.trim() ? '#D85A30' : theme.border.default }]}
                activeOpacity={0.85}
              >
                {isWorking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
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

// ── Main catalog screen ───────────────────────────────────────────────────────

export default function ServiceCatalogScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [formVisible, setFormVisible] = useState(false)
  const [formInitial, setFormInitial] = useState<ServiceFormInit>(EMPTY_FORM)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return SERVICE_CATALOG
    return SERVICE_CATALOG
      .map((cat) => ({
        ...cat,
        services: cat.services.filter((s) => s.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.label.toLowerCase().includes(q) || cat.services.length > 0)
  }, [search])

  const toggleCategory = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleAddService = (name: string, category: string) => {
    setFormInitial({ ...EMPTY_FORM, name, category })
    setFormVisible(true)
  }

  const handleFormSaved = () => {
    setFormVisible(false)
    router.back()
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: top + 10, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.headerCancel, { color: theme.text.secondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Add Services</Text>
        <View style={{ width: 52 }} />
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchWrap, { backgroundColor: theme.bg.base, borderBottomColor: theme.border.subtle }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.bg.elevated }]}>
          <Ionicons name="search" size={16} color={theme.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search for a service..."
            placeholderTextColor={theme.text.tertiary}
            style={[styles.searchInput, { color: theme.text.primary }]}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* ── Title ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={[styles.selectTitle, { color: theme.text.primary }]}>Select a Service</Text>
      </View>

      {/* ── Category list ── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map((cat) => {
          const isOpen = !collapsed.has(cat.id)
          const hasServices = cat.services.length > 0

          return (
            <View key={cat.id}>
              {/* Category header */}
              <TouchableOpacity
                onPress={() => toggleCategory(cat.id)}
                style={[styles.catHeader, { borderBottomColor: theme.border.subtle }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.catLabel, { color: theme.text.primary }]}>{cat.label}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.text.tertiary}
                />
              </TouchableOpacity>

              {/* Services under category */}
              {isOpen && (
                hasServices ? (
                  cat.services.map((svcName) => (
                    <View
                      key={`${cat.id}::${svcName}`}
                      style={[styles.serviceItem, { borderBottomColor: theme.border.subtle }]}
                    >
                      <Text style={[styles.serviceItemName, { color: theme.text.secondary }]}>
                        {svcName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleAddService(svcName, cat.label)}
                        style={styles.addCircleBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle-outline" size={24} color="#D85A30" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  // Category with no predefined services (Massage, Photography, etc.)
                  <TouchableOpacity
                    onPress={() => handleAddService(cat.label, cat.label)}
                    style={[styles.serviceItem, { borderBottomColor: theme.border.subtle }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.serviceItemName, { color: theme.text.tertiary }]}>
                      Add custom {cat.label.toLowerCase()} service
                    </Text>
                    <Ionicons name="add-circle-outline" size={24} color="#D85A30" />
                  </TouchableOpacity>
                )
              )}
            </View>
          )
        })}

        {filtered.length === 0 && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={36} color={theme.text.tertiary} />
            <Text style={[styles.noResultsText, { color: theme.text.secondary }]}>
              No services found for "{search}"
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Form modal ── */}
      <CatalogServiceForm
        visible={formVisible}
        initial={formInitial}
        onClose={() => setFormVisible(false)}
        onSaved={handleFormSaved}
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
  headerCancel: { fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 15 },
  selectTitle: { fontSize: 20, fontWeight: '700' },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catLabel: { fontSize: 16, fontWeight: '700' },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 28, paddingRight: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceItemName: { flex: 1, fontSize: 15, marginRight: 12 },
  addCircleBtn: {},
  noResults: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  noResultsText: { fontSize: 15, textAlign: 'center' },
  // Shared form styles
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
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
