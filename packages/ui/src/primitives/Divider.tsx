import React from 'react'
import { View } from 'react-native'
import { useTheme } from '../hooks/useTheme'

interface DividerProps {
  vertical?: boolean
  className?: string
}

export function Divider({ vertical = false }: DividerProps) {
  const { theme } = useTheme()
  return (
    <View
      style={
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: theme.border.default }
          : { height: 1, width: '100%', backgroundColor: theme.border.default }
      }
    />
  )
}
