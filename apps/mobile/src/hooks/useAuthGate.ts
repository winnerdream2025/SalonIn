import { useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useAuthGateStore } from '../store/authGateStore'

/**
 * Returns a `gate()` function. Call it before any protected action.
 * - If the user is logged in: runs the action immediately.
 * - If not: shows the AuthGateModal with the given redirect path + message.
 *
 * @example
 *   const gate = useAuthGate()
 *   <Button onPress={() => gate(() => handleFollow(id), { redirect: '/(tabs)', message: 'Sign in to follow professionals' })} />
 */
export function useAuthGate() {
  const user = useAuthStore((s) => s.user)
  const show = useAuthGateStore((s) => s.show)

  const gate = useCallback(
    (
      action: () => void,
      opts?: { redirect?: string; message?: string },
    ) => {
      if (user) {
        action()
      } else {
        show(opts?.redirect ?? '/(tabs)', opts?.message ?? '')
      }
    },
    [user, show],
  )

  return gate
}
