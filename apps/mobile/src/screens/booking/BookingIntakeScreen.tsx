import React, { useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, Button, useTheme } from '@salonin/ui'
import type { IntakeForm, IntakeQuestion } from '../../services/booking/booking.types'

export default function BookingIntakeScreen() {
  const {
    providerId, providerType, serviceId, serviceName,
    servicePrice, serviceCurrency, serviceDuration,
    date, startTime, providerName, intakeFormRaw,
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
    providerName: string
    intakeFormRaw: string
  }>()

  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const form: IntakeForm | null = (() => {
    try { return JSON.parse(intakeFormRaw ?? 'null') as IntakeForm }
    catch { return null }
  })()

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!form) return {}
    const init: Record<string, string> = {}
    for (const q of form.questions) {
      init[q.id] = ''
    }
    return init
  })

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }, [])

  const handleNext = useCallback(() => {
    if (!form) {
      router.back()
      return
    }
    // Check required fields
    for (const q of form.questions) {
      if (q.required) {
        const val = answers[q.id]
        if (val === '' || val === undefined || val === null) {
          Alert.alert('Required field', `Please answer: "${q.question}"`)
          return
        }
      }
    }

    // Serialize answers for the confirm screen
    const intakeAnswers = form.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? '',
    }))

    router.push({
      pathname: '/booking/confirm',
      params: {
        providerId,
        providerType: providerType ?? 'professional',
        serviceId,
        serviceName,
        servicePrice,
        serviceCurrency,
        serviceDuration,
        date,
        startTime,
        providerName: providerName ?? '',
        intakeFormId: form.id,
        intakeAnswers: JSON.stringify(intakeAnswers),
      },
    } as never)
  }, [form, answers, providerId, providerType, serviceId, serviceName, servicePrice, serviceCurrency, serviceDuration, date, startTime, providerName])

  if (!form) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg.base, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Form not found.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary, letterSpacing: -0.3 }}>
            {form.title}
          </Text>
          {form.description ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>
              {form.description}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 100 }}>
        {form.questions.map((q: IntakeQuestion, idx: number) => (
          <QuestionField
            key={q.id}
            question={q}
            index={idx}
            value={answers[q.id] ?? ''}
            onChange={(v) => setAnswer(q.id, v)}
            theme={theme}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottom, 24), borderTopColor: theme.border.subtle, backgroundColor: theme.bg.base }]}>
        <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
          Continue to Confirm
        </Button>
      </View>
    </View>
  )
}

function QuestionField({
  question,
  index,
  value,
  onChange,
  theme,
}: {
  question: IntakeQuestion
  index: number
  value: string
  onChange: (v: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={[styles.questionCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.questionLabel}>
        <View style={[styles.questionNum, { backgroundColor: '#D85A3015' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#D85A30' }}>{index + 1}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary, lineHeight: 20 }}>
          {question.question}
          {question.required && <Text style={{ color: '#E24B4A' }}> *</Text>}
        </Text>
      </View>

      {/* text / textarea */}
      {(question.type === 'text' || question.type === 'textarea') && (
        <TextInput
          value={value as string}
          onChangeText={(v) => onChange(v)}
          placeholder="Your answer"
          placeholderTextColor={theme.text.tertiary}
          multiline={question.type === 'textarea'}
          numberOfLines={question.type === 'textarea' ? 3 : 1}
          style={[styles.textInput, {
            backgroundColor: theme.bg.elevated,
            borderColor: theme.border.default,
            color: theme.text.primary,
            minHeight: question.type === 'textarea' ? 72 : undefined,
          }]}
        />
      )}

      {/* radio / select — single choice */}
      {(question.type === 'radio' || question.type === 'select') && question.options && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {question.options.map((opt) => {
            const selected = value === opt
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                activeOpacity={0.75}
                style={[styles.choiceBtn, {
                  borderColor: selected ? '#D85A30' : theme.border.default,
                  backgroundColor: selected ? '#D85A3012' : theme.bg.elevated,
                }]}
              >
                <View style={[styles.choiceDot, {
                  borderColor: selected ? '#D85A30' : theme.border.default,
                  backgroundColor: selected ? '#D85A30' : 'transparent',
                }]} />
                <Text style={{ fontSize: 14, color: selected ? '#D85A30' : theme.text.primary, fontWeight: selected ? '600' : '400' }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* checkbox — multi-select stored as comma-separated string */}
      {question.type === 'checkbox' && question.options && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {question.options.map((opt) => {
            const selected = (value as string).split(',').includes(opt)
            const toggle = () => {
              const current = (value as string).split(',').filter(Boolean)
              const next = selected ? current.filter((v) => v !== opt) : [...current, opt]
              onChange(next.join(','))
            }
            return (
              <TouchableOpacity
                key={opt}
                onPress={toggle}
                activeOpacity={0.75}
                style={[styles.choiceBtn, {
                  borderColor: selected ? '#D85A30' : theme.border.default,
                  backgroundColor: selected ? '#D85A3012' : theme.bg.elevated,
                }]}
              >
                <View style={[styles.checkBox, {
                  borderColor: selected ? '#D85A30' : theme.border.default,
                  backgroundColor: selected ? '#D85A30' : 'transparent',
                }]}>
                  {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={{ fontSize: 14, color: selected ? '#D85A30' : theme.text.primary, fontWeight: selected ? '600' : '400' }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
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
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  questionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  questionLabel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  questionNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  textInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 72,
    textAlignVertical: 'top',
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceDot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
  },
  checkBox: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
})
