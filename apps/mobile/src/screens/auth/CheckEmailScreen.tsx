import React from 'react'
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@salonin/ui'

export default function CheckEmailScreen() {
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.base }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>✉</Text>
      </View>

      <Text style={[styles.title, { color: theme.text.primary }]}>
        Check your email
      </Text>

      <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
        We sent a password reset link to your email.{'\n'}The link expires in 1 hour.
      </Text>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => void Linking.openURL('mailto:')}
      >
        <Text style={styles.primaryBtnText}>Open email app</Text>
      </Pressable>

      <Pressable
        style={[styles.secondaryBtn, { borderColor: theme.border.default }]}
        onPress={() => router.replace('/(auth)/login' as never)}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.text.primary }]}>
          Back to login
        </Text>
      </Pressable>

      <Text style={[styles.hint, { color: theme.text.tertiary }]}>
        {"Didn't receive it? Check spam or "}
        <Text style={{ color: '#D85A30' }} onPress={() => router.back()}>
          try again
        </Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(216,90,48,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#D85A30',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: { fontSize: 13, textAlign: 'center' },
})
