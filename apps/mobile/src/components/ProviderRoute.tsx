import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useTheme } from '@salonin/ui'
import { useRequireRole } from '../hooks/useRequireRole'

type AllowedRole = 'WORKER' | 'SALON' | 'ADMIN'

/**
 * Wraps a provider-only screen with a client-side role guard.
 *
 * While the guard is checking (or redirecting an unauthorized user), a neutral
 * loading state is shown instead of the protected content.
 */
export function ProviderRoute({
  children,
  allowedRoles = ['WORKER', 'SALON'],
}: {
  children: React.ReactNode
  allowedRoles?: AllowedRole[]
}) {
  const { theme } = useTheme()
  const { isChecking } = useRequireRole(allowedRoles)

  if (isChecking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg.base }}>
        <ActivityIndicator color={theme.brand.primary} />
      </View>
    )
  }

  return <>{children}</>
}
