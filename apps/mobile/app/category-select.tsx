import React, { useState, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Text, useTheme } from '@salonin/ui'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get('window')
const COLS = 3
const CELL = (width - 48) / COLS

const CATEGORIES = [
  { id: 'hair',     label: 'Hair',         emoji: '💇🏽‍♀️', color: '#D85A30' },
  { id: 'nails',    label: 'Nails',        emoji: '💅🏽', color: '#C2185B' },
  { id: 'braids',   label: 'Braids',       emoji: '🟡',    color: '#F9A825' },
  { id: 'lashes',   label: 'Lashes',       emoji: '👁️',   color: '#7B1FA2' },
  { id: 'barber',   label: 'Barber',       emoji: '✂️',   color: '#1565C0' },
  { id: 'skincare', label: 'Skin Care',    emoji: '🧴',    color: '#2E7D32' },
  { id: 'makeup',   label: 'Makeup',       emoji: '💄',    color: '#AD1457' },
  { id: 'massage',  label: 'Massage',      emoji: '💆🏽',  color: '#00695C' },
  { id: 'wellness', label: 'Wellness',     emoji: '🌿',    color: '#388E3C' },
  { id: 'tattoo',   label: 'Tattoos',      emoji: '🎨',    color: '#37474F' },
  { id: 'brows',    label: 'Brows',        emoji: '🤨',    color: '#5D4037' },
  { id: 'waxing',   label: 'Hair Removal', emoji: '✨',    color: '#F57F17' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

const MAX_SELECT = 5

export default function CategorySelectScreen() {
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set())
  const { theme } = useTheme()

  const toggle = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECT) {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleContinue = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        'salonin-preferred-categories',
        JSON.stringify([...selected]),
      )
    } catch {
      // ignore
    }
    router.replace('/(tabs)/' as never)
  }, [selected])

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)/' as never)
  }, [])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.base }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          What are you looking for?
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Pick up to {MAX_SELECT} to personalize your feed
        </Text>
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => {
          const active = selected.has(cat.id)
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => toggle(cat.id)}
              activeOpacity={0.75}
              style={[styles.cell, { width: CELL }]}
            >
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: active
                      ? `${cat.color}22`
                      : theme.bg.surface,
                    borderColor: active ? cat.color : theme.border.default,
                    borderWidth: active ? 2.5 : 1,
                  },
                ]}
              >
                {active && (
                  <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
                <Text style={styles.emoji}>{cat.emoji}</Text>
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? cat.color : theme.text.secondary,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          style={[
            styles.continueBtn,
            {
              backgroundColor: selected.size > 0 ? '#D85A30' : theme.bg.surface,
              borderColor: selected.size > 0 ? '#D85A30' : theme.border.default,
            },
          ]}
        >
          <Text
            style={[
              styles.continueBtnText,
              { color: selected.size > 0 ? '#fff' : theme.text.tertiary },
            ]}
          >
            {selected.size > 0
              ? `Continue (${selected.size} selected)`
              : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: theme.text.tertiary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const CIRCLE_SIZE = CELL * 0.58

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 4,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  emoji: { fontSize: CIRCLE_SIZE * 0.38 },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  label: { fontSize: 12, textAlign: 'center' },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  continueBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  continueBtnText: { fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontSize: 13 },
})
