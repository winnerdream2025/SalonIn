import React from 'react'
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme, Logo } from '@salonin/ui'
import { useAuthGateStore } from '../store/authGateStore'

export function AuthGateModal() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { visible, redirectAfterAuth, message, hide } = useAuthGateStore()

  const handleLogin = () => {
    hide()
    router.push({
      pathname: '/(auth)/login',
      params: { redirect: redirectAfterAuth },
    } as never)
  }

  const handleRegister = () => {
    hide()
    router.push('/(auth)/register' as never)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={hide}
    >
      {/* Dimmed backdrop */}
      <Pressable style={styles.backdrop} onPress={hide} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.bg.surface,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.border.default }]} />

        {/* Close */}
        <Pressable
          style={styles.closeBtn}
          onPress={hide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color={theme.text.secondary} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Logo size={52} />
        </View>

        <Text style={[styles.title, { color: theme.text.primary }]}>
          {message.length > 0 ? message : 'Sign in to continue'}
        </Text>
        <Text style={[styles.sub, { color: theme.text.secondary }]}>
          Join My Salon In — the beauty workforce marketplace for professionals and salons.
        </Text>

        {/* Primary CTA */}
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleRegister}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>Create free account</Text>
        </Pressable>

        {/* Secondary CTA */}
        <Pressable
          style={[
            styles.btn,
            styles.btnSecondary,
            {
              backgroundColor: theme.bg.elevated,
              borderColor: theme.border.default,
            },
          ]}
          onPress={handleLogin}
          android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
        >
          <Text style={[styles.btnText, { color: theme.text.primary }]}>Sign in</Text>
        </Pressable>

        {/* Divider note */}
        <Text style={[styles.note, { color: theme.text.tertiary }]}>
          Discovery and Jobs are always free to browse
        </Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      android: { elevation: 24 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
  },
  logoWrap: {
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  btnPrimary: {
    backgroundColor: '#D85A30',
  },
  btnSecondary: {
    borderWidth: 0.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
})
