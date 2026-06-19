import React from 'react'
import { Text as RNText, TextStyle, TextProps as RNTextProps } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { Skeleton } from './Skeleton'

/**
 * Text variant scale — aligned with SalonIn design system.
 *
 * heading  — section/card headings (20px bold)
 * title    — screen sub-headings (17px semibold)
 * body     — default readable text (15px regular)
 * caption  — meta info, timestamps (12px regular)
 * label    — all-caps or badge labels (12px semibold, tight tracking)
 */
type TextVariant = 'heading' | 'title' | 'body' | 'caption' | 'label'
type TextColor = 'primary' | 'secondary' | 'brand'

export interface TextProps extends RNTextProps {
  variant?: TextVariant
  color?: TextColor
  className?: string
}

const SIZES: Record<TextVariant, number> = {
  heading: 20,
  title: 17,
  body: 15,
  caption: 12,
  label: 12,
}

const WEIGHTS: Record<TextVariant, TextStyle['fontWeight']> = {
  heading: '700',
  title: '600',
  body: '400',
  caption: '400',
  label: '600',
}

const LINE_HEIGHTS: Record<TextVariant, number> = {
  heading: 26,
  title: 23,
  body: 22,
  caption: 17,
  label: 17,
}

const LETTER_SPACINGS: Record<TextVariant, number> = {
  heading: -0.3,
  title: -0.2,
  body: 0,
  caption: 0,
  label: 0.4,
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: TextProps) {
  const { theme } = useTheme()
  const clr =
    color === 'secondary' ? theme.text.secondary
    : color === 'brand' ? theme.brand.primary
    : theme.text.primary

  return (
    <RNText
      style={[
        {
          fontSize: SIZES[variant],
          fontWeight: WEIGHTS[variant],
          lineHeight: LINE_HEIGHTS[variant],
          letterSpacing: LETTER_SPACINGS[variant],
          color: clr,
        },
        style,
      ]}
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
