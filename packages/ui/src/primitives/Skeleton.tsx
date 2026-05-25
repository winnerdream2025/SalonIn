import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { useTheme } from '../hooks/useTheme'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  radius?: number
  className?: string
}

export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  const { theme } = useTheme()
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{
        backgroundColor: theme.skeleton.base,
        width,
        height,
        borderRadius: radius,
        opacity,
      }}
    />
  )
}
