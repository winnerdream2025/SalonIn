import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text, Input, Button, useTheme } from '@salonin/ui'
import { bookingsApi } from '../../services/booking/booking.api'
import { useMyProviderId, useProviderServices } from '../../services/booking/booking.hooks'
import type { ProviderService } from '../../services/booking/booking.types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowTimeStr() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function NewBookingScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const { providerId, providerType } = useMyProviderId()
  const { services: allServices } = useProviderServices(providerId, providerType)
  const services = allServices.filter((s) => s.isActive)

  const [selectedService, setSelectedService] = useState<ProviderService | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState(nowTimeStr())
  const [notes, setNotes] = useState('')
  const [isWalkIn, setIsWalkIn] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!selectedService) {
      Alert.alert('Select a service', 'Please choose a service for this booking.')
      return
    }
    if (!clientName.trim()) {
      Alert.alert('Client name required', 'Enter the client\'s name.')
      return
    }
    if (!clientEmail.trim()) {
      Alert.alert('Client email required', 'Enter the client\'s email.')
      return
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    const timeRe = /^\d{2}:\d{2}$/
    if (!dateRe.test(date)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.')
      return
    }
    if (!timeRe.test(startTime)) {
      Alert.alert('Invalid time', 'Use HH:mm format.')
      return
    }

    setIsSaving(true)
    try {
      await bookingsApi.create({
        providerId: selectedService.providerId,
        providerType,
        serviceId: selectedService.id,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: clientPhone.trim() || undefined,
        date,
        startTime,
        notes: notes.trim() || undefined,
        isWalkIn,
        isProviderCreated: true,
      })
      Alert.alert('Booking created ✓', `${clientName}'s booking is confirmed.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Could not create booking.'
      Alert.alert('Error', msg)
    } finally {
      setIsSaving(false)
    }
  }, [selectedService, clientName, clientEmail, clientPhone, date, startTime, notes, isWalkIn, providerType])

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bg.base }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]}>New Booking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service selector */}
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>SERVICE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRow}>
          {services.length === 0 ? (
            <Text style={{ color: theme.text.secondary, fontSize: 14, paddingVertical: 8 }}>
              No services — add one via My Services first.
            </Text>
          ) : (
            services.map((svc) => {
              const active = selectedService?.id === svc.id
              return (
                <TouchableOpacity
                  key={svc.id}
                  onPress={() => setSelectedService(svc)}
                  style={[
                    styles.serviceChip,
                    {
                      backgroundColor: active ? '#D85A30' : theme.bg.elevated,
                      borderColor: active ? '#D85A30' : theme.border.default,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : theme.text.primary }}>
                    {svc.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.8)' : theme.text.tertiary, marginTop: 2 }}>
                    {svc.duration} min · ${svc.price}
                  </Text>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>

        {/* Client details */}
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 20 }]}>CLIENT</Text>
        <View style={styles.field}>
          <Input
            label="Full name *"
            value={clientName}
            onChangeText={setClientName}
            placeholder="Jane Smith"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.field}>
          <Input
            label="Email *"
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="jane@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Input
            label="Phone (optional)"
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="+1 555 000 0000"
            keyboardType="phone-pad"
          />
        </View>

        {/* Date & time */}
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 4 }]}>DATE & TIME</Text>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Input
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-01"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Input
              label="Start time (HH:mm)"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="10:30"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 4 }]}>NOTES (OPTIONAL)</Text>
        <View style={styles.field}>
          <Input
            label=""
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requests or notes…"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Walk-in toggle */}
        <View style={[styles.walkInRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>Walk-in</Text>
            <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>
              Skip availability check, confirm immediately
            </Text>
          </View>
          <Switch
            value={isWalkIn}
            onValueChange={setIsWalkIn}
            trackColor={{ false: theme.border.default, true: '#D85A30' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* CTA */}
        <View style={{ marginTop: 24 }}>
          <Button variant="primary" fullWidth loading={isSaving} onPress={handleCreate}>
            Create Booking
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  serviceRow: { gap: 10, paddingBottom: 4 },
  serviceChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
  },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row' },
  walkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
})
