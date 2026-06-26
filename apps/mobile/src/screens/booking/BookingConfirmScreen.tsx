import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, useTheme } from '@salonin/ui'
import { useAuthStore } from '../../store/authStore'
import {
  useCreateBooking,
  useBookingPayment,
} from '../../services/booking/booking.hooks'

// Stripe hook guard — falls back to no-ops in Expo Go (StripeSdk native module absent)
type UseStripeResult = Pick<ReturnType<typeof import('@stripe/stripe-react-native').useStripe>, 'initPaymentSheet' | 'presentPaymentSheet'>
let _useStripe: () => UseStripeResult
try {
  _useStripe = (require('@stripe/stripe-react-native') as { useStripe: () => UseStripeResult }).useStripe
} catch {
  _useStripe = () => ({
    initPaymentSheet: async () => ({}),
    presentPaymentSheet: async () => ({ error: undefined }),
  })
}

function formatTime12(hhmm: string): string {
  const [hStr = '0', mStr = '00'] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${period}`
}

function formatDateDisplay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

interface InfoRowProps {
  label: string
  value: string
  theme: ReturnType<typeof useTheme>['theme']
}

function InfoRow({ label, value, theme }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={{ fontSize: 13, color: theme.text.tertiary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, textAlign: 'right', flex: 2 }}>
        {value}
      </Text>
    </View>
  )
}

export default function BookingConfirmScreen() {
  const {
    providerId,
    providerType,
    serviceId,
    serviceName,
    servicePrice,
    serviceCurrency,
    serviceDuration,
    date,
    startTime,
    endTime,
    staffName,
    providerName,
    intakeFormId,
    intakeAnswers,
  } = useLocalSearchParams<{
    providerId: string
    providerType: string
    serviceId: string
    serviceName: string
    servicePrice: string
    serviceCurrency: string
    serviceDuration: string
    date: string
    startTime: string
    endTime: string
    staffName: string
    providerName: string
    intakeFormId?: string
    intakeAnswers?: string
  }>()

  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)

  const price = parseFloat(servicePrice ?? '0')
  const currency = serviceCurrency ?? 'USD'
  const duration = parseInt(serviceDuration ?? '60', 10)

  // Pre-fill name from email prefix (User has no dedicated name field) and phone from profile
  const [clientName, setClientName] = useState(() =>
    user?.email ? user.email.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
  )
  const [clientPhone, setClientPhone] = useState(() => (user as any)?.phone ?? '')
  const [notes, setNotes] = useState('')

  const { initPaymentSheet, presentPaymentSheet } = _useStripe()
  const { createBooking, isSubmitting, error: bookingError } = useCreateBooking()
  const { createIntent, isProcessing, error: paymentError } = useBookingPayment()

  const displayError = bookingError ?? paymentError

  const handleConfirm = useCallback(async () => {
    if (!user?.email) {
      Alert.alert('Sign in required', 'Please sign in to book an appointment.')
      return
    }
    if (!clientName.trim()) {
      Alert.alert('Name required', 'Please enter your name.')
      return
    }
    if (!clientPhone.trim()) {
      Alert.alert('Phone required', 'Please enter your phone number.')
      return
    }

    const parsedAnswers = (() => {
      try { return intakeAnswers ? (JSON.parse(intakeAnswers) as { questionId: string; answer: unknown }[]) : undefined }
      catch { return undefined }
    })()

    const booking = await createBooking({
      providerId: providerId ?? '',
      providerType: providerType ?? 'professional',
      serviceId: serviceId ?? '',
      clientName: clientName.trim(),
      clientEmail: user.email,
      clientPhone: clientPhone.trim() || undefined,
      date: date ?? '',
      startTime: startTime ?? '',
      notes: notes.trim() || undefined,
      ...(intakeFormId && parsedAnswers ? { intakeFormId, intakeAnswers: parsedAnswers } : {}),
    })

    if (!booking) return // error shown by hook

    if (price > 0) {
      const intent = await createIntent(booking.id)

      if (intent?.clientSecret) {
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: intent.clientSecret,
          merchantDisplayName: providerName ?? 'SalonIn',
          allowsDelayedPaymentMethods: false,
        })

        if (initError) {
          Alert.alert('Payment Error', initError.message)
          return
        }

        const { error: presentError } = await presentPaymentSheet()

        if (presentError) {
          if (presentError.code !== 'Canceled') {
            Alert.alert('Payment failed', presentError.message)
          }
          return
        }
      }
    }

    // Success — show confirmation and navigate back
    Alert.alert(
      'Booking Confirmed',
      `Your appointment for ${serviceName} on ${formatDateDisplay(date ?? '')} at ${formatTime12(startTime ?? '')} has been confirmed.${booking.confirmationCode ? `\n\nConfirmation: ${booking.confirmationCode}` : ''}`,
      [
        {
          text: 'Done',
          onPress: () => router.dismissAll(),
        },
      ],
    )
  }, [user, clientName, clientPhone, notes, createBooking, createIntent, serviceId, date, startTime, price, serviceName, providerId, providerType])

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.bg.elevated,
      borderColor: theme.border.default,
      color: theme.text.primary,
    },
  ]

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bg.base }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3, marginLeft: 12 }}>
          Confirm Booking
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 100 }}>
        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text.primary, marginBottom: 12 }}>
            Booking Summary
          </Text>

          <InfoRow label="Provider" value={providerName ?? ''} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <InfoRow label="Service" value={serviceName ?? ''} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <InfoRow label="Date" value={formatDateDisplay(date ?? '')} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <InfoRow
            label="Time"
            value={`${formatTime12(startTime ?? '')}${endTime ? ` – ${formatTime12(endTime)}` : ''}`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <InfoRow
            label="Duration"
            value={duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`}
            theme={theme}
          />
          {staffName ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
              <InfoRow label="With" value={staffName} theme={theme} />
            </>
          ) : null}
          <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
          <View style={styles.infoRow}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#D85A30' }}>
              {price > 0 ? formatPrice(price, currency) : 'Free'}
            </Text>
          </View>
        </View>

        {/* Client details */}
        <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>YOUR DETAILS</Text>

        <View style={[styles.inputGroup, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
          <TextInput
            value={clientName}
            onChangeText={setClientName}
            placeholder="Full name"
            placeholderTextColor={theme.text.tertiary}
            style={[inputStyle, { borderRadius: 0, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth }]}
          />
          <TextInput
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="Phone number (required)"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="phone-pad"
            style={[inputStyle, { borderRadius: 0, borderWidth: 0, borderBottomWidth: StyleSheet.hairlineWidth }]}
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes for the provider (optional)"
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={3}
            style={[inputStyle, { borderRadius: 0, borderWidth: 0, minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
          />
        </View>

        {displayError ? (
          <Text style={{ color: '#E24B4A', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {displayError}
          </Text>
        ) : null}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(bottom, 24), borderTopColor: theme.border.subtle, backgroundColor: theme.bg.base }]}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleConfirm}
          disabled={isSubmitting || isProcessing}
          loading={isSubmitting || isProcessing}
          fullWidth
        >
          {isSubmitting ? 'Booking...' : isProcessing ? 'Processing payment...' : `Confirm${price > 0 ? ` & Pay ${formatPrice(price, currency)}` : ''}`}
        </Button>
      </View>
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
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  divider: { height: StyleSheet.hairlineWidth },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
