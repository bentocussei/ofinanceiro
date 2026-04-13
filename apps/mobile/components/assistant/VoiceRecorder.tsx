import { Ionicons } from '@expo/vector-icons'
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import * as Haptics from 'expo-haptics'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'

import { getTokens } from '../../lib/api'
import { getContextHeader } from '../../lib/context'
import { colors, themeColors } from '../../lib/tokens'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export default function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder)

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  const isRecording = recorderState.isRecording

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isRecording, pulseAnim])

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync()
      if (!perm.granted) {
        Alert.alert(
          'Permissao necessaria',
          'Precisamos de acesso ao microfone para gravar audio.'
        )
        return
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })

      await recorder.prepareToRecordAsync()
      recorder.record()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel iniciar a gravacao.')
    }
  }, [recorder])

  const stopRecording = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await recorder.stop()
      const uri = recorder.uri

      if (!uri) {
        Alert.alert('Erro', 'Nao foi possivel obter o ficheiro de audio.')
        return
      }

      // Send to backend for transcription
      setIsTranscribing(true)

      const { access } = await getTokens()
      const formData = new FormData()
      formData.append('file', {
        uri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as any)

      const headers: Record<string, string> = {
        'X-Context': getContextHeader(),
      }
      if (access) headers['Authorization'] = `Bearer ${access}`

      const res = await fetch(`${API_URL}/api/v1/chat/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro na transcricao' }))
        throw new Error(typeof err.detail === 'string' ? err.detail : 'Erro na transcricao')
      }

      const data = await res.json()
      if (data.text) {
        onTranscription(data.text)
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao transcrever audio.')
    } finally {
      setIsTranscribing(false)
    }
  }, [recorder, onTranscription])

  const handlePress = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const isDisabled = disabled || isTranscribing

  if (isTranscribing) {
    return (
      <View style={styles.transcribingContainer}>
        <Text style={[styles.transcribingText, { color: tc.textMuted }]}>
          A transcrever...
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.durationContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          style={[
            styles.micBtn,
            isRecording && styles.micBtnRecording,
            isDisabled && styles.micBtnDisabled,
          ]}
          onPress={handlePress}
          disabled={isDisabled}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={22}
            color={isRecording ? '#FFFFFF' : tc.icon}
          />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micBtn: {
    padding: 8,
  },
  micBtnRecording: {
    backgroundColor: colors.error,
    borderRadius: 20,
  },
  micBtnDisabled: {
    opacity: 0.3,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  durationText: {
    fontSize: 12,
    color: colors.error,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  transcribingContainer: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  transcribingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
})
