import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useTheme } from '@salonin/ui'
import { messagesApi } from '@salonin/api-client'

const SAMPLE_INTERVAL_MS = 100
const MAX_DURATION_MS = 120_000
const TARGET_BAR_COUNT = 60
const WAVEFORM_SEND_COUNT = 60

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number, waveformData: number[]) => void
  onCancel: () => void
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'uploading'

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const { theme } = useTheme()
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bars, setBars] = useState<number[]>([])
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const meteringRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)
  const rawMetering = useRef<number[]>([])
  const pulseAnim = useRef(new Animated.Value(1)).current

  const clearTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (meteringRef.current) { clearInterval(meteringRef.current); meteringRef.current = null }
  }

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start()
  }, [pulseAnim])

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation()
    pulseAnim.setValue(1)
  }, [pulseAnim])

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) return

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 32000,
        },
      })
      await recording.startAsync()
      recordingRef.current = recording
      startTimeRef.current = Date.now()
      pausedElapsedRef.current = 0
      rawMetering.current = []
      setState('recording')
      startPulse()

      timerRef.current = setInterval(() => {
        const elapsed = pausedElapsedRef.current + (Date.now() - startTimeRef.current)
        setElapsedMs(elapsed)
        if (elapsed >= MAX_DURATION_MS) {
          void stopAndPrepare()
        }
      }, 100)

      meteringRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync()
          if (status.isRecording && status.metering != null) {
            const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60))
            rawMetering.current.push(normalized)
            setBars((prev) => {
              const next = [...prev, normalized]
              return next.slice(-TARGET_BAR_COUNT)
            })
          }
        } catch {
          // ignore metering errors
        }
      }, SAMPLE_INTERVAL_MS)
    } catch {
      // ignore permission/setup errors
    }
  }, [startPulse])

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current || state !== 'recording') return
    clearTimers()
    stopPulse()
    pausedElapsedRef.current += Date.now() - startTimeRef.current
    await recordingRef.current.pauseAsync().catch(() => undefined)
    setState('paused')
  }, [state, stopPulse])

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current || state !== 'paused') return
    await recordingRef.current.startAsync().catch(() => undefined)
    startTimeRef.current = Date.now()
    setState('recording')
    startPulse()

    timerRef.current = setInterval(() => {
      const elapsed = pausedElapsedRef.current + (Date.now() - startTimeRef.current)
      setElapsedMs(elapsed)
      if (elapsed >= MAX_DURATION_MS) void stopAndPrepare()
    }, 100)

    meteringRef.current = setInterval(async () => {
      try {
        const status = await recordingRef.current?.getStatusAsync()
        if (status?.isRecording && status.metering != null) {
          const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60))
          rawMetering.current.push(normalized)
          setBars((prev) => [...prev, normalized].slice(-TARGET_BAR_COUNT))
        }
      } catch { /* ignore */ }
    }, SAMPLE_INTERVAL_MS)
  }, [state, startPulse])

  const stopAndPrepare = useCallback(async () => {
    clearTimers()
    stopPulse()
    if (!recordingRef.current) return

    const totalElapsed = pausedElapsedRef.current + (state === 'recording' ? Date.now() - startTimeRef.current : 0)
    const durationSeconds = Math.max(1, Math.round(totalElapsed / 1000))

    try {
      await recordingRef.current.stopAndUnloadAsync()
    } catch {
      // ignore
    }

    const uri = recordingRef.current.getURI()
    recordingRef.current = null
    if (!uri) { onCancel(); return }

    setState('uploading')

    try {
      const mimeType = Platform.OS === 'android' ? 'audio/m4a' : 'audio/m4a'
      const { url } = await messagesApi.uploadAudio(uri, mimeType)

      const finalWaveform = buildFinalWaveform(rawMetering.current)
      onSend(url, durationSeconds, finalWaveform)
    } catch {
      setState('paused')
    }
  }, [state, onCancel, onSend, stopPulse])

  const cancelRecording = useCallback(async () => {
    clearTimers()
    stopPulse()
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => undefined)
      recordingRef.current = null
    }
    onCancel()
  }, [onCancel, stopPulse])

  useEffect(() => {
    void startRecording()
    return () => {
      clearTimers()
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined)
      }
    }
  }, [])

  const isUploading = state === 'uploading'

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.card, borderTopColor: theme.border.default }]}>
      <TouchableOpacity
        onPress={() => void cancelRecording()}
        style={styles.cancelBtn}
        activeOpacity={0.7}
        disabled={isUploading}
      >
        <Ionicons name="trash-outline" size={22} color={theme.semantic.error.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={[styles.waveRow]}>
          {bars.map((amp, i) => {
            const height = 4 + amp * 24
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: state === 'paused' ? theme.text.tertiary : theme.brand.primary,
                    opacity: 0.4 + 0.6 * amp,
                  },
                ]}
              />
            )
          })}
        </View>

        <View style={styles.statusRow}>
          {state === 'recording' && (
            <Animated.View style={[styles.redDot, { transform: [{ scale: pulseAnim }] }]} />
          )}
          {state === 'paused' && (
            <View style={[styles.pausedDot, { backgroundColor: theme.text.tertiary }]} />
          )}
          <Text style={[styles.timer, { color: theme.text.secondary }]}>
            {isUploading ? 'Sending…' : formatMs(elapsedMs)}
          </Text>
        </View>
      </View>

      {(state === 'recording' || state === 'paused') && (
        <TouchableOpacity
          onPress={state === 'recording' ? () => void pauseRecording() : () => void resumeRecording()}
          style={styles.pauseBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={state === 'recording' ? 'pause' : 'mic'}
            size={22}
            color={theme.text.primary}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => void stopAndPrepare()}
        style={[styles.sendBtn, { backgroundColor: theme.brand.primary }]}
        activeOpacity={0.8}
        disabled={isUploading || elapsedMs < 500}
      >
        <Ionicons name="send" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

function buildFinalWaveform(raw: number[]): number[] {
  if (raw.length === 0) return Array(WAVEFORM_SEND_COUNT).fill(0.3)
  const step = raw.length / WAVEFORM_SEND_COUNT
  return Array.from({ length: WAVEFORM_SEND_COUNT }, (_, i) => {
    const start = Math.floor(i * step)
    const end = Math.min(Math.floor((i + 1) * step), raw.length)
    if (end <= start) return raw[start] ?? 0
    let sum = 0
    for (let j = start; j < end; j++) sum += raw[j] ?? 0
    return sum / (end - start)
  })
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    gap: 4,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 1.5,
    overflow: 'hidden',
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53535',
  },
  pausedDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  timer: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  pauseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
