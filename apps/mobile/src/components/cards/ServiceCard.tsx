import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@salonin/ui'
import type { ProviderService } from '../../services/booking/booking.types'

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatServicePrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

interface ServiceCardProps {
  service: ProviderService
  onPress?: () => void
  onBook?: () => void
  onEdit?: () => void
  onDelete?: () => void
  mode?: 'booking' | 'manage' | 'preview'
  theme?: ReturnType<typeof useTheme>['theme']
}

export function ServiceCard({ service, onPress, onBook, onEdit, onDelete, mode = 'booking', theme: themeProp }: ServiceCardProps) {
  const { theme: themeCtx } = useTheme()
  const theme = themeProp ?? themeCtx

  const mins = service.duration
  const durationLabel = mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
    : `${mins}m`

  const priceLabel = service.price > 0
    ? formatServicePrice(service.price, service.currency)
    : 'Price TBD'

  const cardStyle = [styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]
  const inner = (
    <>
      <View style={styles.info}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, marginBottom: 2 }}>
          {service.name}
        </Text>
        {service.description ? (
          <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 18, marginBottom: 4 }}>
            {service.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: theme.bg.elevated }]}>
            <Ionicons name="time-outline" size={11} color={theme.text.tertiary} />
            <Text style={{ fontSize: 12, color: theme.text.secondary, marginLeft: 3 }}>{durationLabel}</Text>
          </View>
          {service.depositAmount ? (
            <View style={[styles.chip, { backgroundColor: 'rgba(29,158,117,0.10)' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1D9E75' }}>
                {formatServicePrice(service.depositAmount, service.currency)} dep.
              </Text>
            </View>
          ) : null}
          {service.category ? (
            <View style={[styles.chip, { backgroundColor: theme.bg.elevated }]}>
              <Text style={{ fontSize: 11, color: theme.text.tertiary }}>{service.category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#D85A30', textAlign: 'right' }}>
          {priceLabel}
        </Text>

        {mode === 'booking' && onBook ? (
          <TouchableOpacity
            onPress={onBook}
            activeOpacity={0.8}
            style={styles.bookBtn}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Book</Text>
          </TouchableOpacity>
        ) : mode === 'manage' ? (
          <View style={styles.manageRow}>
            {onEdit ? (
              <TouchableOpacity onPress={onEdit} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={18} color={theme.text.secondary} />
              </TouchableOpacity>
            ) : null}
            {onDelete ? (
              <TouchableOpacity onPress={onDelete} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color="#E24B4A" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} style={{ marginTop: 4 }} />
        )}
      </View>
    </>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={cardStyle}>
        {inner}
      </TouchableOpacity>
    )
  }
  return <View style={cardStyle}>{inner}</View>
}

export function ServiceCardSkeleton({ theme: themeProp }: { theme?: ReturnType<typeof useTheme>['theme'] }) {
  const { theme: themeCtx } = useTheme()
  const theme = themeProp ?? themeCtx
  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
      <View style={styles.info}>
        <View style={[styles.skeletonLine, { width: 160, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 220, marginTop: 8, backgroundColor: theme.border.default }]} />
        <View style={[styles.skeletonLine, { width: 80, marginTop: 8, backgroundColor: theme.border.default }]} />
      </View>
      <View style={[styles.skeletonLine, { width: 56, height: 22, backgroundColor: theme.border.default }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  info: { flex: 1, marginRight: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  right: { alignItems: 'flex-end', gap: 6 },
  bookBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  manageRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  skeletonLine: { height: 14, borderRadius: 7 },
})
