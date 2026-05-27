import { useColorScheme } from 'react-native'

export interface Theme {
  bg: { base: string; surface: string; elevated: string; input: string }
  border: { default: string; subtle: string }
  text: { primary: string; secondary: string }
  brand: { primary: string; light: string; dark: string }
  avail: { now: string; today: string; weekend: string; none: string }
  skeleton: { base: string; highlight: string }
  semantic: { error: { text: string } }
}

const dark: Theme = {
  bg: {
    base: '#0A0A0A',
    surface: '#111111',
    elevated: '#1A1A1A',
    input: '#141414',
  },
  border: { default: '#1E1E1E', subtle: '#2A2A2A' },
  text: { primary: '#FFFFFF', secondary: '#999999' },
  brand: { primary: '#D85A30', light: '#FF8C5A', dark: '#993C1D' },
  avail: { now: '#1D9E75', today: '#378ADD', weekend: '#EF9F27', none: '#555555' },
  skeleton: { base: '#1E1E1E', highlight: '#2A2A2A' },
  semantic: { error: { text: '#E24B4A' } },
}

const light: Theme = {
  bg: {
    base: '#F5F5F7',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    input: '#FFFFFF',
  },
  border: { default: '#F0F0F0', subtle: '#E5E5E5' },
  text: { primary: '#0A0A0A', secondary: '#6A6A6A' },
  brand: { primary: '#D85A30', light: '#FF8C5A', dark: '#993C1D' },
  avail: { now: '#1D9E75', today: '#378ADD', weekend: '#EF9F27', none: '#555555' },
  skeleton: { base: '#EEEEEE', highlight: '#F5F5F5' },
  semantic: { error: { text: '#E24B4A' } },
}

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme !== 'light'
  return { theme: isDark ? dark : light, isDark }
}
