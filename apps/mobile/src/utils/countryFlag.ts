/**
 * Convert an ISO 3166-1 alpha-2 country code to its flag emoji.
 * e.g. "US" → "🇺🇸", "NG" → "🇳🇬"
 */
export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)),
    )
}
