import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@salonin/ui'

interface Props {
  icon?: string
  title: string
  body: string
  redirectPath?: string
}

export function AuthPromptView({ icon = '○', title, body, redirectPath }: Props) {
  const { theme } = useTheme()
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.base, paddingBottom: bottom }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.bg.elevated }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.text.secondary }]}>{body}</Text>
      <Pressable
        onPress={() => router.push('/(auth)/register')}
        style={[styles.btn, styles.btnPrimary]}
      >
        <Text style={[styles.btnLabel, { color: '#FFFFFF' }]}>Create free account</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          router.push(
            redirectPath
              ? ({ pathname: '/(auth)/login', params: { redirect: redirectPath } } as never)
              : ('/(auth)/login' as never),
          )
        }
        style={[styles.btn, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default, borderWidth: 0.5 }]}
      >
        <Text style={[styles.btnLabel, { color: theme.text.primary }]}>Sign in</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: { fontSize: 28 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  btn: {
    width: '100%',
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimary: { backgroundColor: '#D85A30' },
  btnLabel: { fontSize: 15, fontWeight: '700' },
})
