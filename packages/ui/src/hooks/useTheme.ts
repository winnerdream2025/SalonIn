import { useColorScheme } from 'react-native'

export interface Theme {
  bg: { base: string; surface: string; elevated: string; input: string; card: string }
  border: { default: string; subtle: string }
  text: { primary: string; secondary: string; tertiary: string; inverse: string }
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
    card: '#161616',
  },
  border: { default: '#1E1E1E', subtle: '#2A2A2A' },
  text: { primary: '#FFFFFF', secondary: '#999999', tertiary: '#555555', inverse: '#000000' },
  brand: { primary: '#D85A30', light: '#FF8C5A', dark: '#993C1D' },
  avail: { now: '#1D9E75', today: '#378ADD', weekend: '#EF9F27', none: '#555555' },
  skeleton: { base: '#1E1E1E', highlight: '#2A2A2A' },
  semantic: { error: { text: '#E24B4A' } },
}

const light: Theme = {
  bg: {
    base: '#F8F6F3',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    input: '#F0EDE8',
    card: '#FFFFFF',
  },
  border: { default: '#E8E4DF', subtle: '#F0EDE8' },
  text: { primary: '#1A1A1A', secondary: '#6B6B6B', tertiary: '#AAAAAA', inverse: '#FFFFFF' },
  brand: { primary: '#D85A30', light: '#F4A88A', dark: '#993C1D' },
  avail: { now: '#1D9E75', today: '#378ADD', weekend: '#EF9F27', none: '#555555' },
  skeleton: { base: '#EEEEEE', highlight: '#F5F5F5' },
  semantic: { error: { text: '#E24B4A' } },
}

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  return { theme: isDark ? dark : light, isDark }
}
