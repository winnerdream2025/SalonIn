import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Avatar, Text, useTheme } from '@salonin/ui'

export type AppStatus = 'PENDING' | 'VIEWED' | 'ACCEPTED' | 'DECLINED'

export const APP_STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pending',  color: '#6B6B6B', bg: 'rgba(107,107,107,0.12)' },
  VIEWED:   { label: 'Viewed',   color: '#378ADD', bg: 'rgba(55,138,221,0.15)'  },
  ACCEPTED: { label: 'Accepted', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)'  },
  DECLINED: { label: 'Declined', color: '#E24B4A', bg: 'rgba(226,75,74,0.15)'   },
}

interface ApplicationCardProps {
  workerName?: string
  workerPhoto?: string
  jobTitle?: string
  salonName?: string
  status: AppStatus
  appliedAt: string
  coverNote?: string
  specialties?: string[]
  onPress?: () => void
  onAccept?: () => void
  onDecline?: () => void
  mode?: 'worker' | 'salon'
  theme?: ReturnType<typeof useTheme>['theme']
}

export function ApplicationCard({
  workerName,
  workerPhoto,
  jobTitle,
  salonName,
  status,
  appliedAt,
  coverNote,
  specialties,
  onPress,
  onAccept,
  onDecline,
  mode = 'worker',
  theme: themeProp,
}: ApplicationCardProps) {
  const { theme: themeCtx } = useTheme()
  const theme = themeProp ?? themeCtx
  const cfg = APP_STATUS_CONFIG[status]

  const formattedDate = new Date(appliedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}
    >
      <View style={styles.row}>
        {mode === 'salon' && workerName ? (
          <Avatar uri={workerPhoto} name={workerName} size="sm" />
        ) : null}
        <View style={{ flex: 1, marginLeft: mode === 'salon' ? 10 : 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
            {mode === 'salon' ? (workerName ?? 'Applicant') : (jobTitle ?? 'Job')}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 1 }}>
            {mode === 'salon' ? (specialties?.join(', ') ?? '') : (salonName ?? '')}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2 }}>Applied {formattedDate}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label.toUpperCase()}</Text>
        </View>
      </View>

      {coverNote ? (
        <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 8, lineHeight: 18 }}>
          {coverNote}
        </Text>
      ) : null}

      {mode === 'salon' && status === 'PENDING' && (onAccept || onDecline) ? (
        <View style={styles.actions}>
          {onDecline ? (
            <TouchableOpacity onPress={onDecline} style={[styles.actionBtn, { borderColor: '#E24B4A30' }]} activeOpacity={0.75}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#E24B4A' }}>Decline</Text>
            </TouchableOpacity>
          ) : null}
          {onAccept ? (
            <TouchableOpacity onPress={onAccept} style={[styles.actionBtn, { backgroundColor: '#1D9E75', borderColor: '#1D9E75', flex: 1 }]} activeOpacity={0.8}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Accept</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
})
