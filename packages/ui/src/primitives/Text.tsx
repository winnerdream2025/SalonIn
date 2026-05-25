import React from 'react'
import { Text as RNText, TextStyle, TextProps as RNTextProps } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { Skeleton } from './Skeleton'

type TextVariant = 'heading' | 'title' | 'body' | 'caption' | 'label'
type TextColor = 'primary' | 'secondary' | 'brand'

export interface TextProps extends RNTextProps {
  variant?: TextVariant
  color?: TextColor
  className?: string
}

const SIZES: Record<TextVariant, number> = {
  heading: 24,
  title: 18,
  body: 14,
  caption: 12,
  label: 13,
}

const WEIGHTS: Record<TextVariant, TextStyle['fontWeight']> = {
  heading: '700',
  title: '600',
  body: '400',
  caption: '400',
  label: '500',
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: TextProps) {
  const { theme } = useTheme()
  const clr =
    color === 'secondary' ? theme.text.secondary
    : color === 'brand' ? theme.brand.primary
    : theme.text.primary

  return (
    <RNText
      style={[{ fontSize: SIZES[variant], fontWeight: WEIGHTS[variant], color: clr }, style]}
      {...props}
    />
  )
}

export function TextSkeleton({
  variant = 'body',
  width = '60%',
}: {
  variant?: TextVariant
  width?: number | `${number}%`
}) {
  return <Skeleton width={width} height={SIZES[variant] + 4} />
}
