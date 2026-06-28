import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Switch,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import { intakeFormsApi } from '../../services/booking/booking.api'
import type { IntakeForm, IntakeQuestion } from '../../services/booking/booking.types'

type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'radio', label: 'Single choice' },
  { value: 'checkbox', label: 'Multiple choice' },
  { value: 'select', label: 'Dropdown' },
]

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
  theme,
}: {
  question: IntakeQuestion
  index: number
  onChange: (q: IntakeQuestion) => void
  onRemove: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const needsOptions = ['radio', 'checkbox', 'select'].includes(question.type)

  return (
    <View style={[qStyles.card, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}>
      <View style={qStyles.row}>
        <Text style={[qStyles.num, { color: theme.text.tertiary }]}>{index + 1}</Text>
        <TextInput
          value={question.question}
          onChangeText={(v) => onChange({ ...question, question: v })}
          placeholder="Question text"
          placeholderTextColor={theme.text.tertiary}
          style={[qStyles.questionInput, { color: theme.text.primary, borderColor: theme.border.subtle }]}
          multiline
        />
        <TouchableOpacity onPress={onRemove} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={qStyles.typeRow}>
        {QUESTION_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => onChange({ ...question, type: t.value })}
            style={[
              qStyles.typeChip,
              { borderColor: question.type === t.value ? '#D85A30' : theme.border.subtle },
              question.type === t.value && { backgroundColor: 'rgba(216,90,48,0.08)' },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: question.type === t.value ? '#D85A30' : theme.text.secondary }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {needsOptions && (
        <View style={{ marginTop: 6, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.tertiary }}>OPTIONS (one per line)</Text>
          <TextInput
            value={(question.options ?? []).join('\n')}
            onChangeText={(v) => onChange({ ...question, options: v.split('\n').filter(Boolean) })}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={3}
            style={[qStyles.optionsInput, { color: theme.text.primary, borderColor: theme.border.subtle, backgroundColor: theme.bg.base }]}
          />
        </View>
      )}

      <View style={qStyles.requiredRow}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>Required</Text>
        <Switch
          value={question.required}
          onValueChange={(v) => onChange({ ...question, required: v })}
          trackColor={{ true: '#D85A30', false: theme.border.default }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}

const qStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  num: { fontSize: 13, fontWeight: '700', width: 20, paddingTop: 10 },
  questionInput: {
    flex: 1, fontSize: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6, paddingHorizontal: 2,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  optionsInput: {
    borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13,
    minHeight: 72, textAlignVertical: 'top',
  },
  requiredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})

function newQuestion(): IntakeQuestion {
  return { id: Math.random().toString(36).slice(2), question: '', type: 'text', required: false }
}

export default function IntakeFormBuilderScreen() {
  const { theme } = useTheme()
  const { top, bottom } = useSafeAreaInsets()

  const [forms, setForms] = useState<IntakeForm[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editing, setEditing] = useState<IntakeForm | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<IntakeQuestion[]>([newQuestion()])
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => {
    setIsLoading(true)
    intakeFormsApi.getMyForms()
      .then(setForms)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setQuestions([newQuestion()])
  }

  const openEdit = (form: IntakeForm) => {
    setEditing(form)
    setTitle(form.title)
    setDescription(form.description ?? '')
    setQuestions(form.questions.length > 0 ? form.questions : [newQuestion()])
  }

  const closeEditor = () => setEditing(undefined as unknown as IntakeForm | null)

  const handleSave = useCallback(async () => {
    if (!title.trim()) { Alert.alert('Title required'); return }
    const qs = questions.filter((q) => q.question.trim())
    if (qs.length === 0) { Alert.alert('Add at least one question'); return }
    setIsSaving(true)
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, questions: qs }
      if (editing && editing.id) {
        await intakeFormsApi.update(editing.id, payload)
      } else {
        await intakeFormsApi.create(payload)
      }
      load()
      setEditing(undefined as unknown as IntakeForm | null)
    } catch {
      Alert.alert('Error', 'Could not save form. Try again.')
    } finally {
      setIsSaving(false)
    }
  }, [editing, title, description, questions, load])

  const handleDelete = useCallback((form: IntakeForm) => {
    Alert.alert('Delete Form', `Delete "${form.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await intakeFormsApi.remove(form.id); load() }
          catch { Alert.alert('Error', 'Could not delete.') }
        },
      },
    ])
  }, [load])

  const updateQuestion = (i: number, q: IntakeQuestion) =>
    setQuestions((prev) => prev.map((x, idx) => idx === i ? q : x))

  const removeQuestion = (i: number) =>
    setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  const isEditorOpen = editing !== null && editing !== undefined

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => isEditorOpen ? closeEditor() : router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name={isEditorOpen ? 'arrow-back' : 'arrow-back'} size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text.primary }}>
          {isEditorOpen ? (editing && editing.id ? 'Edit Form' : 'New Form') : 'Intake Forms'}
        </Text>
        {isEditorOpen ? (
          <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={12} activeOpacity={0.7}>
            {isSaving
              ? <ActivityIndicator size="small" color="#D85A30" />
              : <Text style={{ color: '#D85A30', fontSize: 15, fontWeight: '700' }}>Save</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openCreate} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color="#D85A30" />
          </TouchableOpacity>
        )}
      </View>

      {isEditorOpen ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>FORM DETAILS</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Form title (e.g. New Client Intake)"
            placeholderTextColor={theme.text.tertiary}
            style={[styles.inputField, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.card }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor={theme.text.tertiary}
            multiline
            style={[styles.inputField, { color: theme.text.primary, borderColor: theme.border.default, backgroundColor: theme.bg.card, minHeight: 72, textAlignVertical: 'top' }]}
          />

          <Text style={[styles.sectionLabel, { color: theme.text.tertiary, marginTop: 16 }]}>QUESTIONS</Text>
          {questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
              theme={theme}
            />
          ))}
          <TouchableOpacity
            onPress={() => setQuestions((prev) => [...prev, newQuestion()])}
            style={[styles.addQuestionBtn, { borderColor: '#D85A30' }]}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={18} color="#D85A30" />
            <Text style={{ color: '#D85A30', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>Add Question</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#D85A30" /></View>
      ) : forms.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={theme.text.tertiary} />
          <Text style={{ color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            No intake forms yet.{'\n'}Create one to collect client info before bookings.
          </Text>
          <TouchableOpacity onPress={openCreate} style={[styles.createBtn, { backgroundColor: '#D85A30' }]} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Create First Form</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={forms}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openEdit(item)}
              style={[styles.formCard, { backgroundColor: theme.bg.card, borderColor: theme.border.subtle }]}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>
                  {item.questions.length} question{item.questions.length !== 1 ? 's' : ''}
                </Text>
                {item.description ? (
                  <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 4 }} numberOfLines={1}>{item.description}</Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  inputField: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 10,
  },
  addQuestionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  createBtn: {
    marginTop: 20, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  formCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
})
