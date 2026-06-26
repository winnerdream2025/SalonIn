import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { useAuthStore } from '../../store/authStore'
import { workersApi } from '@salonin/api-client'
import { salonsApi } from '@salonin/api-client'

interface PolicyState {
  acceptsBookings: boolean
  instantBooking: boolean
  requiresDeposit: boolean
  depositAmount: string
  cancellationWindowHours: string
  rescheduleWindowHours: string
  lateFeeEnabled: boolean
  lateFeeAmount: string
  homeServiceEnabled: boolean
  travelServiceEnabled: boolean
  travelRadius: string
  travelFee: string
}

const DEFAULTS: PolicyState = {
  acceptsBookings: false,
  instantBooking: false,
  requiresDeposit: false,
  depositAmount: '',
  cancellationWindowHours: '',
  rescheduleWindowHours: '',
  lateFeeEnabled: false,
  lateFeeAmount: '',
  homeServiceEnabled: false,
  travelServiceEnabled: false,
  travelRadius: '',
  travelFee: '',
}

function SectionHeader({ title, theme }: { title: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <Text style={[styles.sectionHeader, { color: theme.text.tertiary }]}>{title}</Text>
  )
}

function SettingRow({
  label,
  sublabel,
  value,
  onChange,
  theme,
}: {
  label: string
  sublabel?: string
  value: boolean
  onChange: (v: boolean) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[styles.row, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{label}</Text>
        {sublabel ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>{sublabel}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#ccc', true: '#D85A30' }}
        thumbColor="#fff"
      />
    </View>
  )
}

function InputRow({
  label,
  sublabel,
  value,
  onChange,
  placeholder,
  numeric,
  prefix,
  suffix,
  theme,
}: {
  label: string
  sublabel?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  numeric?: boolean
  prefix?: string
  suffix?: string
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[styles.inputRow, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{label}</Text>
        {sublabel ? (
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={styles.inputWrap}>
        {prefix ? <Text style={{ fontSize: 14, color: theme.text.secondary, marginRight: 2 }}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(v) => onChange(numeric ? v.replace(/[^0-9.]/g, '') : v)}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          style={[styles.smallInput, { borderColor: theme.border.default, color: theme.text.primary }]}
        />
        {suffix ? <Text style={{ fontSize: 12, color: theme.text.secondary, marginLeft: 4 }}>{suffix}</Text> : null}
      </View>
    </View>
  )
}

export default function BookingSettingsScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user) as Record<string, unknown> | null
  const role = (user?.role as string | undefined) ?? ''
  const isWorker = role !== 'SALON'

  const [state, setState] = useState<PolicyState>(DEFAULTS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const set = <K extends keyof PolicyState>(key: K, value: PolicyState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        if (isWorker) {
          const me = await workersApi.getMe()
          const p = me as unknown as Record<string, unknown>
          setState({
            acceptsBookings: (p.acceptsBookings as boolean | undefined) ?? false,
            instantBooking: (p.instantBooking as boolean | undefined) ?? false,
            requiresDeposit: (p.requiresDeposit as boolean | undefined) ?? false,
            depositAmount: '',
            cancellationWindowHours: (p.cancellationWindowHours != null ? String(p.cancellationWindowHours) : ''),
            rescheduleWindowHours: (p.rescheduleWindowHours != null ? String(p.rescheduleWindowHours) : ''),
            lateFeeEnabled: (p.lateFeeEnabled as boolean | undefined) ?? false,
            lateFeeAmount: (p.lateFeeAmount != null ? String(p.lateFeeAmount) : ''),
            homeServiceEnabled: (p.homeServiceEnabled as boolean | undefined) ?? false,
            travelServiceEnabled: (p.travelServiceEnabled as boolean | undefined) ?? false,
            travelRadius: (p.travelRadius != null ? String(p.travelRadius) : ''),
            travelFee: (p.travelFee != null ? String(p.travelFee) : ''),
          })
        } else {
          const me = await salonsApi.getMe()
          const p = me as unknown as Record<string, unknown>
          setState({
            acceptsBookings: (p.acceptsBookings as boolean | undefined) ?? false,
            instantBooking: (p.instantBooking as boolean | undefined) ?? false,
            requiresDeposit: (p.requiresDeposit as boolean | undefined) ?? false,
            depositAmount: '',
            cancellationWindowHours: (p.cancellationWindowHours != null ? String(p.cancellationWindowHours) : ''),
            rescheduleWindowHours: (p.rescheduleWindowHours != null ? String(p.rescheduleWindowHours) : ''),
            lateFeeEnabled: (p.lateFeeEnabled as boolean | undefined) ?? false,
            lateFeeAmount: (p.lateFeeAmount != null ? String(p.lateFeeAmount) : ''),
            homeServiceEnabled: false,
            travelServiceEnabled: false,
            travelRadius: '',
            travelFee: '',
          })
        }
      } catch {
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [isWorker])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const payload = {
        acceptsBookings: state.acceptsBookings,
        instantBooking: state.instantBooking,
        requiresDeposit: state.requiresDeposit,
        cancellationWindowHours: state.cancellationWindowHours ? parseInt(state.cancellationWindowHours, 10) : undefined,
        rescheduleWindowHours: state.rescheduleWindowHours ? parseInt(state.rescheduleWindowHours, 10) : undefined,
        lateFeeEnabled: state.lateFeeEnabled,
        lateFeeAmount: state.lateFeeEnabled && state.lateFeeAmount ? parseFloat(state.lateFeeAmount) : undefined,
      }
      if (isWorker) {
        await workersApi.updateProfile({
          ...payload,
          homeServiceEnabled: state.homeServiceEnabled,
          travelServiceEnabled: state.travelServiceEnabled,
          travelRadius: state.travelRadius ? parseInt(state.travelRadius, 10) : undefined,
          travelFee: state.travelFee ? parseFloat(state.travelFee) : undefined,
        })
      } else {
        await salonsApi.updateProfile(payload)
      }
      Alert.alert('Saved', 'Booking settings updated.')
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [state, isWorker])

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>Booking Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={12} activeOpacity={0.7}>
          {isSaving
            ? <ActivityIndicator size="small" color="#D85A30" />
            : <Text style={{ fontSize: 15, fontWeight: '700', color: '#D85A30' }}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#D85A30" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Booking Policies ─────────────────────────────────────── */}
          <SectionHeader title="Booking Policies" theme={theme} />

          <SettingRow
            label="Accept Bookings"
            sublabel="Allow clients to book appointments with you"
            value={state.acceptsBookings}
            onChange={(v) => set('acceptsBookings', v)}
            theme={theme}
          />

          <SettingRow
            label="Instant Booking"
            sublabel="Confirm appointments automatically without manual approval"
            value={state.instantBooking}
            onChange={(v) => set('instantBooking', v)}
            theme={theme}
          />

          <InputRow
            label="Cancellation Window"
            sublabel="Minimum hours before appointment clients can cancel"
            value={state.cancellationWindowHours}
            onChange={(v) => set('cancellationWindowHours', v)}
            placeholder="e.g. 24"
            numeric
            suffix="hrs"
            theme={theme}
          />

          <InputRow
            label="Reschedule Window"
            sublabel="Minimum hours before appointment clients can reschedule"
            value={state.rescheduleWindowHours}
            onChange={(v) => set('rescheduleWindowHours', v)}
            placeholder="e.g. 12"
            numeric
            suffix="hrs"
            theme={theme}
          />

          {/* ── Payment Settings ──────────────────────────────────────── */}
          <SectionHeader title="Payment Settings" theme={theme} />

          <SettingRow
            label="Require Deposit"
            sublabel="Clients must pay a deposit to confirm their booking"
            value={state.requiresDeposit}
            onChange={(v) => set('requiresDeposit', v)}
            theme={theme}
          />

          <SettingRow
            label="Late Fee"
            sublabel="Charge a fee for last-minute cancellations"
            value={state.lateFeeEnabled}
            onChange={(v) => set('lateFeeEnabled', v)}
            theme={theme}
          />

          {state.lateFeeEnabled && (
            <InputRow
              label="Late Fee Amount"
              value={state.lateFeeAmount}
              onChange={(v) => set('lateFeeAmount', v)}
              placeholder="e.g. 25"
              numeric
              prefix="$"
              theme={theme}
            />
          )}

          {/* ── Travel Settings (workers only) ───────────────────────── */}
          {isWorker && (
            <>
              <SectionHeader title="Travel Settings" theme={theme} />

              <SettingRow
                label="Home Service"
                sublabel="You travel to the client's home"
                value={state.homeServiceEnabled}
                onChange={(v) => set('homeServiceEnabled', v)}
                theme={theme}
              />

              <SettingRow
                label="Travel Service"
                sublabel="You travel to various locations"
                value={state.travelServiceEnabled}
                onChange={(v) => set('travelServiceEnabled', v)}
                theme={theme}
              />

              {(state.homeServiceEnabled || state.travelServiceEnabled) && (
                <>
                  <InputRow
                    label="Travel Radius"
                    value={state.travelRadius}
                    onChange={(v) => set('travelRadius', v)}
                    placeholder="e.g. 25"
                    numeric
                    suffix="mi"
                    theme={theme}
                  />
                  <InputRow
                    label="Travel Fee"
                    sublabel="Additional charge for travel"
                    value={state.travelFee}
                    onChange={(v) => set('travelFee', v)}
                    placeholder="e.g. 15"
                    numeric
                    prefix="$"
                    theme={theme}
                  />
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: bottom + 16, borderTopColor: theme.border.subtle, backgroundColor: theme.bg.base }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { opacity: isSaving ? 0.6 : 1 }]}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Settings</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 2,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 2,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  inputWrap: { flexDirection: 'row', alignItems: 'center' },
  smallInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, minWidth: 70, textAlign: 'right',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    backgroundColor: '#D85A30', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
})
