import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useTheme } from '@salonin/ui'
import { mediaApi } from '@salonin/api-client'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DURATION_MS = 120_000   // 2 minutes
const BAR_WINDOW     = 60         // bars shown live during recording
const WAVEFORM_BARS  = 60         // bars stored & sent

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function downsample(raw: number[], target: number): number[] {
  if (raw.length === 0) return Array(target).fill(0.3)
  const step = raw.length / target
  return Array.from({ length: target }, (_, i) => {
    const start = Math.floor(i * step)
    const end   = Math.min(Math.floor((i + 1) * step), raw.length)
    if (end <= start) return raw[start] ?? 0.3
    let sum = 0
    for (let j = start; j < end; j++) sum += raw[j] ?? 0
    return sum / (end - start)
  })
}

// ─── Recording options ────────────────────────────────────────────────────────

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,                 // ← required for waveform
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
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordState = 'recording' | 'paused' | 'uploading' | 'error'

export interface VoiceRecorderProps {
  onSend:   (audioUrl: string, duration: number, waveformData: number[]) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const { theme } = useTheme()

  // UI state
  const [recState,  setRecState]  = useState<RecordState>('recording')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [liveBars,  setLiveBars]  = useState<number[]>([])

  // Refs — never stale in callbacks
  const recordingRef  = useRef<Audio.Recording | null>(null)
  const rawMetering   = useRef<number[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const startMsRef    = useRef(0)
  const pausedMsRef   = useRef(0)
  const recStateRef   = useRef<RecordState>('recording')
  const pulseAnim     = useRef(new Animated.Value(1)).current

  // Keep ref in sync with state
  const setState = useCallback((s: RecordState) => {
    recStateRef.current = s
    setRecState(s)
  }, [])

  // ── Timer ──────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    startMsRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = pausedMsRef.current + (Date.now() - startMsRef.current)
      setElapsedMs(elapsed)
      if (elapsed >= MAX_DURATION_MS) {
        // use ref to avoid stale closure
        if (recStateRef.current === 'recording') {
          stopTimer()
          void doSend()
        }
      }
    }, 100)
  }, [stopTimer])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pulse animation ────────────────────────────────────────────────────────

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]),
    ).start()
  }, [pulseAnim])

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation()
    pulseAnim.setValue(1)
  }, [pulseAnim])

  // ── Start recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('Microphone permission', 'Please allow microphone access in Settings.')
        onCancel()
        return
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })

      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        (status) => {
          if (!status.isRecording) return
          if (status.metering != null) {
            // dBFS: typical range -160..0; normalise to 0-1
            const norm = Math.max(0, Math.min(1, (status.metering + 60) / 60))
            rawMetering.current.push(norm)
            setLiveBars((prev) => [...prev, norm].slice(-BAR_WINDOW))
          }
        },
        100, // status update interval ms
      )

      recordingRef.current = recording
      rawMetering.current  = []
      pausedMsRef.current  = 0
      setState('recording')
      startTimer()
      startPulse()
    } catch {
      Alert.alert('Recording failed', 'Could not start recording. Please check microphone access and try again.')
      onCancel()
    }
  }, [setState, startTimer, startPulse, onCancel])

  // ── Pause ──────────────────────────────────────────────────────────────────

  const pauseRecording = useCallback(async () => {
    if (recStateRef.current !== 'recording' || !recordingRef.current) return
    stopTimer()
    stopPulse()
    pausedMsRef.current += Date.now() - startMsRef.current

    // pauseAsync is iOS-only; on Android we just leave it running but freeze UI
    if (Platform.OS === 'ios') {
      await recordingRef.current.pauseAsync().catch(() => undefined)
    }
    setState('paused')
  }, [stopTimer, stopPulse, setState])

  // ── Resume ─────────────────────────────────────────────────────────────────

  const resumeRecording = useCallback(async () => {
    if (recStateRef.current !== 'paused' || !recordingRef.current) return

    if (Platform.OS === 'ios') {
      // On iOS resume the paused recording
      await recordingRef.current.startAsync().catch(() => undefined)
    }
    // Android: recording never stopped, just re-enable timer & UI
    setState('recording')
    startTimer()
    startPulse()
  }, [setState, startTimer, startPulse])

  // ── Send (stop → upload → callback) ───────────────────────────────────────

  const doSend = useCallback(async () => {
    stopTimer()
    stopPulse()
    if (!recordingRef.current) return

    const elapsed = pausedMsRef.current + (
      recStateRef.current === 'recording' ? Date.now() - startMsRef.current : 0
    )
    const durationSeconds = Math.max(1, Math.round(elapsed / 1000))

    await recordingRef.current.stopAndUnloadAsync().catch(() => undefined)
    const uri = recordingRef.current.getURI()
    recordingRef.current = null

    if (!uri) { onCancel(); return }

    setState('uploading')

    try {
      const { url } = await mediaApi.uploadMedia(
        { uri, mimeType: 'audio/m4a', name: `voice_${Date.now()}.m4a` },
        'voice',
      )
      const waveformData = downsample(rawMetering.current, WAVEFORM_BARS)
      onSend(url, durationSeconds, waveformData)
    } catch {
      setState('error')
      Alert.alert(
        'Upload failed',
        'Could not send voice message. Please try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Retry',  onPress: () => void doSend() },
        ],
      )
    }
  }, [stopTimer, stopPulse, onCancel, onSend, setState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const cancelRecording = useCallback(async () => {
    stopTimer()
    stopPulse()
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => undefined)
      recordingRef.current = null
    }
    onCancel()
  }, [stopTimer, stopPulse, onCancel])

  // ── Mount / unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    void startRecording()
    return () => {
      stopTimer()
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────

  const isUploading = recState === 'uploading'
  const isPaused    = recState === 'paused'
  const isRecording = recState === 'recording'

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.card, borderTopColor: theme.border.default }]}>
      {/* Cancel / trash */}
      <TouchableOpacity
        onPress={() => void cancelRecording()}
        style={styles.iconBtn}
        activeOpacity={0.7}
        disabled={isUploading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={22} color={theme.semantic.error.text} />
      </TouchableOpacity>

      {/* Centre: waveform + status row */}
      <View style={styles.center}>
        <View style={styles.waveRow}>
          {liveBars.length === 0 ? (
            // Placeholder bars while waiting for first metering sample
            Array.from({ length: 20 }, (_, i) => (
              <View
                key={i}
                style={[styles.bar, {
                  height: 4 + 8 * Math.abs(Math.sin(i * 0.8)),
                  backgroundColor: theme.border.default,
                }]}
              />
            ))
          ) : (
            liveBars.map((amp, i) => (
              <View
                key={i}
                style={[styles.bar, {
                  height: Math.max(4, amp * 28),
                  backgroundColor: isPaused ? theme.text.tertiary : theme.brand.primary,
                  opacity: Math.max(0.35, amp),
                }]}
              />
            ))
          )}
        </View>

        <View style={styles.statusRow}>
          {isRecording && (
            <Animated.View style={[styles.redDot, { transform: [{ scale: pulseAnim }] }]} />
          )}
          {isPaused && (
            <View style={[styles.pausedDot, { backgroundColor: theme.text.tertiary }]} />
          )}
          <Text style={[styles.timer, { color: theme.text.secondary }]}>
            {isUploading ? 'Sending…' : formatMs(elapsedMs)}
          </Text>
          {isPaused && (
            <Text style={[styles.pauseLabel, { color: theme.text.tertiary }]}>Paused</Text>
          )}
        </View>
      </View>

      {/* Pause / Resume */}
      {(isRecording || isPaused) && (
        <TouchableOpacity
          onPress={isRecording ? () => void pauseRecording() : () => void resumeRecording()}
          style={[styles.iconBtn, { backgroundColor: theme.bg.elevated, borderRadius: 18 }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isRecording ? 'pause' : 'mic'}
            size={20}
            color={theme.text.primary}
          />
        </TouchableOpacity>
      )}

      {/* Send */}
      <TouchableOpacity
        onPress={() => void doSend()}
        style={[styles.sendBtn, {
          backgroundColor: (!isUploading && elapsedMs >= 500) ? theme.brand.primary : theme.bg.elevated,
        }]}
        activeOpacity={0.8}
        disabled={isUploading || elapsedMs < 500}
      >
        {isUploading ? (
          <Ionicons name="hourglass-outline" size={16} color={theme.text.tertiary} />
        ) : (
          <Ionicons name="send" size={16} color={elapsedMs >= 500 ? '#FFFFFF' : theme.text.tertiary} />
        )}
      </TouchableOpacity>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 64,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    gap: 2,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',   // bars grow from bottom
    height: 30,
    gap: 1.5,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E53535',
  },
  pausedDot: {
    width: 7,
    height: 7,
    borderRadius: 1,
  },
  timer: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  pauseLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
