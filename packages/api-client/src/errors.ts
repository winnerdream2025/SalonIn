/**
 * Maps raw API / network error messages to short, user-friendly strings.
 * Use everywhere you catch an API call and want to show a human message.
 *
 *   catch (e) { Alert.alert('Error', parseApiError(e)) }
 */
export function parseApiError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)

  // --- JSON-encoded payloads (e.g. blocked chat request) ---
  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw) as { blocked?: boolean; reason?: string; error?: string }
      if (data.blocked && data.reason === 'REQUEST_PENDING') {
        return "You've reached the 3-message limit. Wait for the recipient to accept your request."
      }
      if (data.error) return parseApiError(new Error(data.error))
    } catch {}
  }

  const lower = raw.toLowerCase()

  // --- Network / connectivity ---
  if (lower.includes('network error') || lower.includes('econnrefused') || lower.includes('econnreset')) {
    return 'No connection. Check your internet and try again.'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return 'Request timed out. Please try again.'
  }

  // --- Auth ---
  if (lower.includes('unauthorized') || lower.includes('invalid token') || lower.includes('jwt')) {
    return 'Session expired. Please sign in again.'
  }
  if (lower.includes('insufficient role') || lower.includes('forbidden')) {
    return "You don't have permission to do this."
  }

  // --- Messaging ---
  if (lower.includes('cannot message yourself') || lower.includes("can't message yourself")) {
    return "You can't message yourself."
  }
  if (lower.includes('message must have content') || lower.includes('empty message')) {
    return "Message can't be empty."
  }
  if (lower.includes('chat request was declined') || lower.includes('request was declined')) {
    return 'Your chat request was declined.'
  }
  if (lower.includes('accept the request before')) {
    return 'Accept the chat request before replying.'
  }

  // --- Jobs / applications ---
  if (lower.includes('already applied') || lower.includes('already have an application')) {
    return "You've already applied to this position."
  }
  if (lower.includes('job post not found') || lower.includes('not found')) {
    return 'This listing is no longer available.'
  }
  if (lower.includes('job has expired') || lower.includes('expired')) {
    return 'This listing has expired.'
  }
  if (lower.includes('only workers can apply') || lower.includes('salon') && lower.includes('cannot apply')) {
    return 'Only worker accounts can apply to jobs.'
  }

  // --- Validation noise (class-validator messages) ---
  // These are technical messages that should never reach users as-is
  if (
    lower.includes('must be a string') ||
    lower.includes('must be a number') ||
    lower.includes('must be one of') ||
    lower.includes('should not be empty') ||
    lower.includes('is not valid') ||
    lower.includes('must match') ||
    lower.includes('request failed with status code')
  ) {
    return 'Something went wrong. Please try again.'
  }

  // --- Generic server errors ---
  if (lower.includes('internal server error') || lower.includes('500')) {
    return 'Something went wrong on our end. Please try again.'
  }

  // --- Pass through reasonable messages (capitalised, with period) ---
  if (raw && raw.length < 120) {
    const cleaned = raw.charAt(0).toUpperCase() + raw.slice(1)
    return cleaned.endsWith('.') || cleaned.endsWith('!') ? cleaned : `${cleaned}.`
  }

  return 'Something went wrong. Please try again.'
}
