import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useTheme } from '../hooks/useTheme'

const BAR_COUNT = 30
const BAR_MIN_HEIGHT = 3
const BAR_MAX_HEIGHT = 22

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function normalizeWaveform(raw: number[] | null | undefined): number[] {
  if (!raw || raw.length === 0) {
    return Array.from({ length: BAR_COUNT }, (_, i) =>
      0.2 + 0.6 * Math.abs(Math.sin(i * 0.7)),
    )
  }
  const bars: number[] = []
  const step = raw.length / BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.floor(i * step)
    const end = Math.min(Math.floor((i + 1) * step), raw.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += raw[j] ?? 0
    bars.push(end > start ? sum / (end - start) : 0)
  }
  const max = Math.max(...bars, 0.01)
  return bars.map((v) => Math.max(v / max, 0.08))
}

interface VoiceMessageBubbleProps {
  audioUrl: string
  duration?: number | null
  waveformData?: number[] | null
  isSelf: boolean
}

export function VoiceMessageBubble({
  audioUrl,
  duration,
  waveformData,
  isSelf,
}: VoiceMessageBubbleProps) {
  const { theme } = useTheme()
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMs, setCurrentMs] = useState(0)
  const durationMs = (duration ?? 0) * 1000
  const bars = normalizeWaveform(waveformData)

  const tint = isSelf ? 'rgba(255,255,255,0.9)' : theme.brand.primary
  const waveActive = isSelf ? 'rgba(255,255,255,0.9)' : theme.brand.primary
  const waveInactive = isSelf ? 'rgba(255,255,255,0.35)' : theme.border.default

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => undefined)
      await soundRef.current.unloadAsync().catch(() => undefined)
      soundRef.current = null
    }
    setIsPlaying(false)
    setProgress(0)
    setCurrentMs(0)
  }, [])

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync().catch(() => undefined)
      }
      setIsPlaying(false)
      return
    }

    if (soundRef.current) {
      await soundRef.current.playAsync().catch(() => undefined)
      setIsPlaying(true)
      return
    }

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return
          const dur = status.durationMillis ?? durationMs
          if (dur > 0) setProgress(status.positionMillis / dur)
          setCurrentMs(status.positionMillis)
          if (status.didJustFinish) {
            setIsPlaying(false)
            setProgress(0)
            setCurrentMs(0)
          }
        },
      )
      soundRef.current = sound
      setIsPlaying(true)
    } catch {
      Alert.alert('Playback error', 'Could not play this audio message. Please try again.')
    }
  }, [isPlaying, audioUrl, durationMs])

  useEffect(() => {
    return () => {
      void stopSound()
    }
  }, [stopSound])

  const displayMs = isPlaying ? currentMs : durationMs

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => void togglePlay()} style={styles.playBtn} activeOpacity={0.7}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={tint}
        />
      </TouchableOpacity>

      <View style={styles.waveContainer}>
        {bars.map((amp, i) => {
          const barProgress = (i + 1) / BAR_COUNT
          const active = barProgress <= progress
          const height = BAR_MIN_HEIGHT + amp * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT)
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: active ? waveActive : waveInactive,
                },
              ]}
            />
          )
        })}
      </View>

      <Text style={[styles.timer, { color: isSelf ? 'rgba(255,255,255,0.65)' : theme.text.tertiary }]}>
        {formatDuration(displayMs)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  waveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: BAR_MAX_HEIGHT + 4,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  timer: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
})
