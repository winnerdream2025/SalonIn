import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native'
import type { ReportType } from '@salonin/types'
import { Button } from '../primitives/Button'
import { useTheme } from '../hooks/useTheme'

export interface ReportModalProps {
  isVisible: boolean
  reportedName: string
  onClose: () => void
  onSubmit: (type: ReportType, reason?: string) => void | Promise<void>
}

const OPTIONS: { type: ReportType; label: string; description: string }[] = [
  { type: 'FAKE_PROFILE',  label: 'Fake Profile',  description: 'This account appears to be fake or impersonating someone' },
  { type: 'NO_SHOW',       label: 'No Show',        description: 'They did not show up to a confirmed meeting' },
  { type: 'INAPPROPRIATE', label: 'Inappropriate',  description: 'Inappropriate content or behavior' },
]

export function ReportModal({ isVisible, reportedName, onClose, onSubmit }: ReportModalProps) {
  const { theme } = useTheme()
  const [selected, setSelected] = useState<ReportType | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selected || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(selected, reason.trim() || undefined)
      setSelected(null)
      setReason('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelected(null)
    setReason('')
    onClose()
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity
          style={[styles.sheet, { backgroundColor: theme.bg.card, borderTopColor: theme.border.subtle }]}
          activeOpacity={1}
          onPress={() => undefined}
        >
          <Text style={[styles.title, { color: theme.text.primary }]}>
            Report {reportedName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Why are you reporting this profile?
          </Text>

          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[
                styles.option,
                { borderColor: theme.border.default, backgroundColor: theme.bg.elevated },
                selected === opt.type && { borderColor: '#D85A30', backgroundColor: 'rgba(216,90,48,0.07)' },
              ]}
              onPress={() => setSelected(opt.type)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: theme.border.default },
                  selected === opt.type && { borderColor: '#D85A30', backgroundColor: '#D85A30' },
                ]}
              />
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionLabel, { color: theme.text.primary }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: theme.text.secondary }]}>{opt.description}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TextInput
            style={[
              styles.reasonInput,
              { backgroundColor: theme.bg.input, borderColor: theme.border.default, color: theme.text.primary },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="Additional details (optional)"
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Button variant="ghost" size="md" onPress={handleClose}>Cancel</Button>
            <Button
              variant="danger"
              size="md"
              onPress={() => { void handleSubmit() }}
              disabled={!selected || isSubmitting}
            >
              {isSubmitting ? 'Sending…' : 'Submit Report'}
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginTop: 1,
  },
  optionTextWrap: { flex: 1, minWidth: 0, gap: 3 },
  optionLabel: { fontSize: 13, fontWeight: '600' },
  optionDesc: { fontSize: 12, lineHeight: 17 },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
})
