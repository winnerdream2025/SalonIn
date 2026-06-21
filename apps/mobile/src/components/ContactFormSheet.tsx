import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@salonin/ui'

interface Props {
  visible: boolean
  onClose: () => void
  onSend: (name: string, phone: string) => void
}

export function ContactFormSheet({ visible, onClose, onSend }: Props) {
  const { theme } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const valid = name.trim().length > 0

  const handleSend = () => {
    if (!valid) return
    onSend(name.trim(), phone.trim())
    setName('')
    setPhone('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.bg.card, paddingBottom: bottom + 20 }]}>
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />
          <Text style={[styles.title, { color: theme.text.primary }]}>Share Contact</Text>
          <View style={styles.form}>
            <View style={[styles.field, { borderColor: theme.border.default, backgroundColor: theme.bg.elevated }]}>
              <Ionicons name="person-outline" size={18} color={theme.text.secondary} style={styles.fieldIcon} />
              <TextInput
                style={[styles.fieldInput, { color: theme.text.primary }]}
                placeholder="Name"
                placeholderTextColor={theme.text.tertiary}
                value={name}
                onChangeText={setName}
                maxLength={200}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.field, { borderColor: theme.border.default, backgroundColor: theme.bg.elevated }]}>
              <Ionicons name="call-outline" size={18} color={theme.text.secondary} style={styles.fieldIcon} />
              <TextInput
                style={[styles.fieldInput, { color: theme.text.primary }]}
                placeholder="Phone number"
                placeholderTextColor={theme.text.tertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={50}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: valid ? '#D85A30' : theme.bg.elevated }]}
            onPress={handleSend}
            disabled={!valid}
            activeOpacity={0.8}
          >
            <Text style={[styles.sendText, { color: valid ? '#fff' : theme.text.tertiary }]}>Send Contact</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 20 },
  form: { gap: 12, marginBottom: 20 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  fieldIcon: { marginRight: 8 },
  fieldInput: { flex: 1, fontSize: 15 },
  sendBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { fontSize: 16, fontWeight: '700' },
})
