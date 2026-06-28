import { useEffect } from 'react'
import { router } from 'expo-router'
import { Role } from '@salonin/types'
import { useAuthStore } from '../store/authStore'

type AllowedRole = `${Role}`

/**
 * Client-side route guard for provider-only screens.
 *
 * Redirects users who are not authenticated, or whose role is not in
 * `allowedRoles`, back to the tabs root. Backend guards remain the source of
 * truth for data access; this hook only prevents unauthorized users from
 * landing on provider management screens via direct navigation.
 *
 * CLIENT accounts (role === 'WORKER' + accountType === 'CLIENT') are treated as
 * non-providers and are redirected away from provider screens.
 *
 * @returns `true` while the auth state is still loading or the redirect is
 * pending, so callers can render a placeholder instead of provider content.
 */
export function useRequireRole(allowedRoles: AllowedRole[]): { isChecking: boolean } {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  const accountType = (user as unknown as { accountType?: string } | null)?.accountType
  const isClient = accountType === 'CLIENT'
  const role = user?.role
  const isAllowed = Boolean(user) && !isClient && role != null && allowedRoles.includes(role as AllowedRole)

  useEffect(() => {
    if (isLoading) return
    if (!isAllowed) {
      router.replace('/(tabs)' as never)
    }
  }, [isLoading, isAllowed])

  return { isChecking: isLoading || !isAllowed }
}
