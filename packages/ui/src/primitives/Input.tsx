import React, { useState } from 'react'
import { View, TextInput, Text, TextInputProps, ViewStyle, TextStyle } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { Skeleton } from './Skeleton'

export interface InputProps extends TextInputProps {
  label?: string
  error?: string
  className?: string
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  const containerStyle: ViewStyle = {
    backgroundColor: theme.bg.input,
    borderWidth: 1,
    borderColor: error
      ? '#E74C3C'
      : focused
        ? theme.brand.primary
        : theme.border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  }

  const inputStyle: TextStyle = {
    color: theme.text.primary,
    fontSize: 15,
    padding: 0,
  }

  const labelStyle: TextStyle = {
    color: theme.text.secondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  }

  const errorStyle: TextStyle = {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 4,
  }

  return (
    <View>
      {label && <Text style={labelStyle}>{label}</Text>}
      <View style={containerStyle}>
        <TextInput
          style={[inputStyle, style]}
          placeholderTextColor={theme.text.secondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={errorStyle}>{error}</Text>}
    </View>
  )
}

export function InputSkeleton() {
  return <Skeleton width="100%" height={52} radius={12} />
}
