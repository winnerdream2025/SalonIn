import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { Skeleton } from './Skeleton'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
  className?: string
}

const V_PAD: Record<ButtonSize, number> = { sm: 10, md: 14, lg: 18 }
const FONT_SZ: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 }

export function Button({
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
}: ButtonProps) {
  const { theme, isDark } = useTheme()

  const BG: Record<ButtonVariant, string> = {
    primary: theme.brand.primary,
    secondary: isDark ? theme.bg.elevated : theme.border.subtle,
    ghost: 'transparent',
    danger: '#E74C3C',
  }

  const TEXT_CLR: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: theme.text.primary,
    ghost: theme.brand.primary,
    danger: '#FFFFFF',
  }

  const containerStyle: ViewStyle = {
    backgroundColor: BG[variant],
    opacity: disabled || loading ? 0.5 : 1,
    borderRadius: 12,
    paddingVertical: V_PAD[size],
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: fullWidth ? '100%' : undefined,
    borderWidth: variant === 'ghost' ? 1 : 0,
    borderColor: variant === 'ghost' ? theme.border.default : undefined,
  }

  const textStyle: TextStyle = {
    color: TEXT_CLR[variant],
    fontSize: FONT_SZ[size],
    fontWeight: '600',
  }

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator size="small" color={TEXT_CLR[variant]} />
        : <Text style={textStyle}>{children}</Text>
      }
    </TouchableOpacity>
  )
}

export function ButtonSkeleton({ fullWidth = false }: { fullWidth?: boolean }) {
  return <Skeleton width={fullWidth ? '100%' : 120} height={48} radius={12} />
}
