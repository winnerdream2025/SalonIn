import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'

export interface ContactMessageBubbleProps {
  contactName: string
  contactPhone?: string | null
  isSelf: boolean
}

export function ContactMessageBubble({ contactName, contactPhone, isSelf }: ContactMessageBubbleProps) {
  const { theme } = useTheme()
  const textColor = isSelf ? '#FFFFFF' : theme.text.primary
  const subColor = isSelf ? 'rgba(255,255,255,0.7)' : theme.text.secondary
  const iconBg = isSelf ? 'rgba(255,255,255,0.2)' : theme.bg.elevated

  const handleCall = () => {
    if (contactPhone) void Linking.openURL(`tel:${contactPhone}`)
  }

  return (
    <Pressable style={styles.row} onPress={handleCall}>
      <View style={[styles.avatar, { backgroundColor: iconBg }]}>
        <Ionicons name="person" size={22} color={textColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{contactName}</Text>
        {contactPhone != null && (
          <Text style={[styles.phone, { color: subColor }]}>{contactPhone}</Text>
        )}
      </View>
      {contactPhone != null && (
        <Ionicons name="call-outline" size={18} color={subColor} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  phone: { fontSize: 12, marginTop: 1 },
})
