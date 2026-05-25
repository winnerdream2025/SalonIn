import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  TextStyle,
} from 'react-native'
import type { ReportType } from '@salonin/types'
import { Button } from '../primitives/Button'

export interface ReportModalProps {
  isVisible: boolean
  reportedName: string
  onClose: () => void
  onSubmit: (type: ReportType, reason?: string) => void | Promise<void>
}

const OPTIONS: { type: ReportType; label: string; description: string }[] = [
  { type: 'FAKE_PROFILE', label: 'Fake Profile', description: 'This account appears to be fake or impersonating someone' },
  { type: 'NO_SHOW', label: 'No Show', description: 'They did not show up to a confirmed meeting' },
  { type: 'INAPPROPRIATE', label: 'Inappropriate', description: 'Inappropriate content or behavior' },
]

export function ReportModal({ isVisible, reportedName, onClose, onSubmit }: ReportModalProps) {
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
      <TouchableOpacity style={OVERLAY} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity style={SHEET} activeOpacity={1} onPress={() => undefined}>
          <Text style={TITLE}>Report {reportedName}</Text>
          <Text style={SUBTITLE}>Why are you reporting this profile?</Text>

          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[OPTION, selected === opt.type && OPTION_ACTIVE]}
              onPress={() => setSelected(opt.type)}
              activeOpacity={0.8}
            >
              <View style={[RADIO, selected === opt.type && RADIO_ACTIVE]} />
              <View style={OPTION_TEXT_WRAP}>
                <Text style={OPTION_LABEL}>{opt.label}</Text>
                <Text style={OPTION_DESC}>{opt.description}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TextInput
            style={REASON_INPUT}
            value={reason}
            onChangeText={setReason}
            placeholder="Additional details (optional)"
            placeholderTextColor="#555555"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={ACTIONS}>
            <Button variant="ghost" size="md" onPress={handleClose}>
              Cancel
            </Button>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const OVERLAY: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.7)',
  justifyContent: 'flex-end',
}

const SHEET: ViewStyle = {
  backgroundColor: '#1A1A1A',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 24,
  gap: 12,
}

const TITLE: TextStyle = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
}

const SUBTITLE: TextStyle = {
  color: '#888888',
  fontSize: 13,
  marginBottom: 4,
}

const OPTION: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  padding: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#2A2A2A',
  backgroundColor: '#111111',
}

const OPTION_ACTIVE: ViewStyle = {
  borderColor: '#D85A30',
  backgroundColor: 'rgba(216,90,48,0.08)',
}

const RADIO: ViewStyle = {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: '#444444',
  marginTop: 1,
}

const RADIO_ACTIVE: ViewStyle = {
  borderColor: '#D85A30',
  backgroundColor: '#D85A30',
}

const OPTION_TEXT_WRAP: ViewStyle = {
  flex: 1,
  gap: 2,
}

const OPTION_LABEL: TextStyle = {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '600',
}

const OPTION_DESC: TextStyle = {
  color: '#888888',
  fontSize: 11,
}

const REASON_INPUT: ViewStyle & TextStyle = {
  backgroundColor: '#111111',
  borderWidth: 1,
  borderColor: '#2A2A2A',
  borderRadius: 10,
  padding: 12,
  color: '#FFFFFF',
  fontSize: 13,
  minHeight: 72,
}

const ACTIONS: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 4,
}
